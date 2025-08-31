# 🚀 Pure Ocean Platform - EC2 완전 배포 가이드

이 가이드는 Pure Ocean Platform을 EC2 서버에 완전히 배포하고 모든 기능을 테스트하는 방법을 설명합니다.

## 📋 배포 전 체크리스트

### 1. 환경 준비 확인
- [ ] EC2 서버: 15.164.202.209 접근 가능
- [ ] POProject.pem 키 파일 존재
- [ ] 도메인: https://xn--ox6bo4n.com (청해.com) DNS 설정 완료
- [ ] SSL 인증서 설정 완료

### 2. 환경 변수 설정 완료 확인
```bash
# .env 파일에 다음 항목들이 설정되어 있는지 확인:
DATABASE_URL=postgresql://postgres:pure_ocean_secure_2025@localhost:5432/pure_ocean
NEXTAUTH_URL=https://xn--ox6bo4n.com
GOOGLE_CLIENT_ID=[OAuth 클라이언트 ID]
GOOGLE_CLIENT_SECRET=[OAuth 클라이언트 시크릿]
GOOGLE_SERVICE_ACCOUNT=[서비스 계정 JSON]
UPSTAGE_API_KEY=up_kcU1IMWm9wcC1rqplsIFMsEeqlUXN
NEXTAUTH_SECRET=3f992d982592e52f42751464597118d779e1761e3773900003f34c39c1f1e81f
ALLOWED_EMAIL_DOMAIN=wando.hs.kr
```

## 🚀 배포 실행

### 1단계: 로컬 빌드 및 배포
```bash
# 프로젝트 루트에서 실행
chmod +x scripts/deploy-ec2.sh
./scripts/deploy-ec2.sh
```

배포 스크립트는 다음 작업을 자동으로 수행합니다:
1. 애플리케이션 빌드
2. 배포 패키지 생성
3. EC2 서버로 파일 업로드
4. PostgreSQL 설정 및 설치
5. 의존성 설치 및 Prisma 스키마 적용
6. PM2로 애플리케이션 시작

### 2단계: 배포 상태 확인
```bash
# EC2 서버에 접속하여 상태 확인
ssh -i POProject.pem ubuntu@15.164.202.209

# PM2 프로세스 상태 확인
pm2 status

# 애플리케이션 로그 확인
pm2 logs pure-ocean-app

# PostgreSQL 상태 확인
sudo systemctl status postgresql

# 포트 사용 상태 확인
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :5432
```

## 🧪 포괄적 기능 테스트

### 1. 데이터베이스 연결 테스트
```bash
# EC2 서버에서 실행
cd /home/ubuntu/pure-ocean
npm run verify:db
```

### 2. Google Docs API 테스트
```bash
# EC2 서버에서 실행
npm run verify:google
```

### 3. 웹 애플리케이션 기본 기능 테스트

#### 3.1 도메인 접근 테스트
```bash
# 로컬에서 실행
curl -I https://xn--ox6bo4n.com
curl -I https://청해.com
```
- ✅ HTTPS 리디렉션 확인
- ✅ SSL 인증서 유효성 확인

#### 3.2 Google OAuth 로그인 테스트
1. 브라우저에서 https://xn--ox6bo4n.com 접속
2. "로그인" 버튼 클릭
3. wando.hs.kr 이메일로 로그인 시도
4. 로그인 성공 및 메인 페이지 리디렉션 확인

#### 3.3 WebSocket 연결 테스트
1. 로그인 후 프로젝트 도우미 탭 접속
2. 브라우저 개발자 도구에서 WebSocket 연결 확인
3. 채팅 메시지 전송하여 실시간 스트리밍 확인

#### 3.4 프로젝트 도우미 기능 테스트
**일반 모드:**
- [ ] "설문조사 항목을 만들어주세요" 클릭
- [ ] 실시간 스트리밍 응답 확인
- [ ] 대화 기록이 사이드바에 저장되는지 확인

**GROW 코칭 모드:**
- [ ] 모드 전환 후 "우리 지역 해양 문제를 조사하고 싶어요" 클릭
- [ ] 코칭 스타일 응답 확인
- [ ] 대화 기록이 저장되지 않는 것 확인 (stateless)

#### 3.5 문서 첨삭 기능 테스트
1. 테스트용 Google Docs 문서 생성
2. 서비스 계정에 편집 권한 부여:
   ```
   [GOOGLE_SERVICE_ACCOUNT의 client_email]@[project-id].iam.gserviceaccount.com
   ```
3. 문서 첨삭 탭에서 URL 입력 후 첨삭 요청
4. 피드백이 문서에 정상 추가되는지 확인

#### 3.6 탭 전환 기능 테스트
- [ ] 대화 있는 상태에서 탭 전환 (assistant ↔ docs)
- [ ] 각 탭의 독립적 상태 유지 확인
- [ ] 사이드바가 assistant 탭에서만 표시되는지 확인

#### 3.7 대화 기록 관리 테스트
- [ ] 새 대화 시작 버튼 기능
- [ ] 이전 대화 불러오기 기능
- [ ] 대화 유형 자동 감지 및 적절한 탭으로 이동

## 🔍 성능 및 안정성 테스트

### 1. 부하 테스트
```bash
# 동시 사용자 시뮬레이션
curl -w "@curl-format.txt" -o /dev/null -s "https://xn--ox6bo4n.com"

# WebSocket 연결 테스트
# 브라우저에서 여러 탭으로 동시 채팅 테스트
```

### 2. 메모리 및 CPU 모니터링
```bash
# EC2 서버에서 실행
# 시스템 리소스 모니터링
top
htop
free -h

# PM2 모니터링
pm2 monit

# PostgreSQL 연결 상태
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

### 3. 로그 분석
```bash
# 애플리케이션 로그
pm2 logs pure-ocean-app --lines 100

# PostgreSQL 로그
sudo tail -f /var/log/postgresql/postgresql-*.log

# 시스템 로그
sudo tail -f /var/log/syslog
```

## 🚨 문제 해결 체크리스트

### 애플리케이션이 시작되지 않는 경우
```bash
# 1. 환경 변수 확인
cat .env

# 2. 의존성 설치 확인
npm install

# 3. Prisma 클라이언트 생성
npx prisma generate

# 4. 데이터베이스 연결 확인
npm run verify:db

# 5. 포트 충돌 확인
sudo lsof -i :3000

# 6. PM2 프로세스 재시작
pm2 delete pure-ocean-app
pm2 start npm --name "pure-ocean-app" -- start
```

### WebSocket 연결 실패
```bash
# 1. 서버 프로세스 확인
pm2 status

# 2. 포트 확인
sudo netstat -tulpn | grep :3000

# 3. 방화벽 설정 확인
sudo ufw status

# 4. 브라우저 콘솔에서 WebSocket 에러 확인
```

### Google Docs API 에러
```bash
# 1. 서비스 계정 설정 확인
npm run verify:google

# 2. 문서 권한 확인
# 서비스 계정 이메일이 문서에 편집자로 공유되었는지 확인

# 3. API 할당량 확인
# Google Cloud Console에서 API 사용량 확인
```

### 데이터베이스 연결 실패
```bash
# 1. PostgreSQL 서비스 확인
sudo systemctl status postgresql

# 2. 연결 테스트
npm run verify:db

# 3. 사용자 및 권한 확인
sudo -u postgres psql -c "\du"

# 4. 데이터베이스 확인
sudo -u postgres psql -c "\l"
```

## 📊 성능 최적화 권장사항

### 1. 서버 설정
```bash
# Node.js 메모리 제한 증가
pm2 delete pure-ocean-app
pm2 start npm --name "pure-ocean-app" --max-memory-restart 1G -- start

# PM2 클러스터 모드 활성화 (선택사항)
pm2 start ecosystem.config.js
```

### 2. PostgreSQL 최적화
```sql
-- PostgreSQL 설정 최적화
-- /etc/postgresql/*/main/postgresql.conf에서 설정

# shared_buffers = 256MB
# effective_cache_size = 1GB
# work_mem = 4MB
# maintenance_work_mem = 64MB
```

### 3. SSL 및 보안 강화
```bash
# HSTS 헤더 설정
# Content Security Policy 강화
# Rate limiting 적용
```

## ✅ 배포 완료 검증

모든 테스트가 통과하면 다음을 확인:

### 기능적 요구사항
- [x] ✅ 탭 전환 로직 정상 작동
- [x] ✅ 사이드바 조건부 렌더링 (프로젝트 도우미만)
- [x] ✅ WebSocket 실시간 스트리밍
- [x] ✅ PostgreSQL 데이터베이스 연결
- [x] ✅ Google Docs API 인증 및 피드백 삽입
- [x] ✅ Google OAuth 로그인 시스템
- [x] ✅ GROW 코칭 모드 (stateless)
- [x] ✅ 문서 첨삭 기능

### 비기능적 요구사항
- [ ] 응답 시간 < 2초
- [ ] WebSocket 연결 안정성
- [ ] SSL 인증서 유효성
- [ ] 동시 사용자 지원
- [ ] 에러 핸들링
- [ ] 로그 수집

## 🎉 배포 완료!

모든 테스트 통과 후:
1. 사용자 교육 자료 준비
2. 운영 모니터링 설정
3. 백업 정책 수립
4. 정기 업데이트 계획

**Pure Ocean Platform이 성공적으로 배포되었습니다!** 🌊

---
## 📞 운영 지원

### 정기 점검 항목
- 서버 리소스 사용량 모니터링
- SSL 인증서 갱신 (Let's Encrypt 자동 갱신)
- 데이터베이스 백업 상태 확인
- API 할당량 사용량 점검

### 비상 연락
- 시스템 장애 시 PM2 재시작: `pm2 restart pure-ocean-app`
- 데이터베이스 연결 문제: PostgreSQL 재시작
- Google API 한도 초과: 할당량 모니터링 및 증가 요청