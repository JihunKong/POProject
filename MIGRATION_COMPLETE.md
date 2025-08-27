# 🎉 AWS EC2 마이그레이션 완료

Railway에서 AWS EC2로의 마이그레이션이 성공적으로 완료되었습니다!

## 📍 새로운 서버 정보

- **서버 주소**: `ec2-15-164-169-201.ap-northeast-2.compute.amazonaws.com`
- **지역**: Seoul (ap-northeast-2)
- **운영체제**: Ubuntu 22.04 LTS
- **서버 사양**: 4GB RAM, 30GB SSD

## 🚀 배포된 구성요소

### ✅ 애플리케이션 스택
- **Node.js**: 18.20.5 (LTS)
- **Next.js**: 15.1.6 (프로덕션 빌드)
- **PostgreSQL**: 14.18 (로컬 데이터베이스)
- **PM2**: 5.5.0 (프로세스 관리자)
- **Nginx**: 1.18.0 (리버스 프록시)

### ✅ 보안 설정
- SSL 보안 헤더 적용
- Gzip 압축 활성화
- PM2 자동 재시작 설정
- 시스템 부팅 시 자동 시작

### ✅ 환경 변수 설정
```bash
NODE_ENV=production
NEXTAUTH_URL=http://ec2-15-164-169-201.ap-northeast-2.compute.amazonaws.com:3000
UPSTAGE_API_KEY=up_kcU1IMWm9wcC1rqplsIFMsEeqlUXN
ALLOWED_EMAIL_DOMAIN=wando.hs.kr
DATABASE_URL=postgresql://pure_ocean:secure_password@localhost:5432/pure_ocean_production
```

## 📋 완료된 작업

1. ✅ **서버 설정**: Ubuntu 업데이트, 필수 패키지 설치
2. ✅ **애플리케이션 배포**: GitHub 클론, 의존성 설치, 빌드
3. ✅ **데이터베이스 설정**: PostgreSQL 설치, 스키마 생성, 시드 데이터
4. ✅ **PM2 프로세스 관리자**: 애플리케이션 실행, 자동 재시작 설정
5. ✅ **Nginx 리버스 프록시**: 설정, 보안 헤더, 압축
6. ✅ **GitHub Actions CI/CD**: 자동 배포 파이프라인 구축

## ⚠️ 현재 상태

### 작동 중인 서비스
- ✅ Next.js 애플리케이션 (포트 3000)
- ✅ PostgreSQL 데이터베이스 (포트 5432)
- ✅ PM2 프로세스 관리자
- ✅ Nginx 웹 서버 (포트 80)

### 해결 필요한 사항
- ⚠️ **AWS Security Group**: 포트 80 (HTTP) 허용 필요
- ⚠️ **도메인/SSL**: 사용자 도메인 연결 및 SSL 인증서 설정 필요

## 🔧 즉시 해결해야 할 사항

### 1. AWS Security Group 설정
```bash
# AWS CLI로 Security Group 수정 (인바운드 규칙 추가)
aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxxxxxx \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 \
    --region ap-northeast-2
```

### 2. 애플리케이션 접속 확인
Security Group 설정 후 다음 URL로 접속 가능:
- http://ec2-15-164-169-201.ap-northeast-2.compute.amazonaws.com

## 📖 GitHub Actions 설정

CI/CD 파이프라인이 준비되었습니다. 다음 시크릿을 GitHub에 추가하세요:

1. **GitHub Repository → Settings → Secrets and variables → Actions**
2. **New repository secret** 클릭
3. 추가할 시크릿:
   - `EC2_SSH_PRIVATE_KEY`: POProject.pem 파일의 내용

## 🔄 배포 프로세스

이제부터는 `main` 브랜치에 푸시할 때마다 자동 배포됩니다:

1. 코드를 `main` 브랜치에 푸시
2. GitHub Actions가 자동 실행
3. 테스트 → 빌드 → 배포
4. PM2가 애플리케이션을 무중단 재시작

## 🧰 유용한 명령어

### 서버 접속
```bash
ssh -i "POProject.pem" ubuntu@ec2-15-164-169-201.ap-northeast-2.compute.amazonaws.com
```

### PM2 관리
```bash
pm2 status              # 프로세스 상태 확인
pm2 logs                # 로그 확인
pm2 restart all         # 재시작
pm2 monit               # 실시간 모니터링
```

### Nginx 관리
```bash
sudo systemctl status nginx    # 상태 확인
sudo systemctl restart nginx   # 재시작
sudo nginx -t                  # 설정 테스트
```

### 데이터베이스 관리
```bash
sudo -u postgres psql pure_ocean_production  # 데이터베이스 접속
npx prisma studio                             # Prisma Studio
npx prisma db push                            # 스키마 동기화
```

## 🎯 다음 단계

1. **AWS Security Group 설정** - 포트 80 허용
2. **도메인 연결** - Route53 또는 외부 DNS 설정
3. **SSL 인증서** - Let's Encrypt 설정
4. **모니터링** - CloudWatch 또는 다른 모니터링 도구 설정
5. **Railway 정리** - 기존 Railway 프로젝트 정리

## 💸 예상 비용

월간 예상 비용 (Seoul 리전):
- **EC2 t3.micro**: ~$8.5/월 (프리티어 사용 시 무료)
- **EBS 스토리지 (30GB)**: ~$2.4/월
- **데이터 전송**: ~$1-5/월
- **총 예상**: ~$12-16/월

---

**마이그레이션이 성공적으로 완료되었습니다! 🎉**

질문이나 문제가 있으시면 언제든 문의하세요.