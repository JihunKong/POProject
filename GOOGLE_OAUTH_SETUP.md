# 🔐 Google OAuth 2.0 설정 가이드

청해.com 도메인으로 이전하면서 Google OAuth 설정을 업데이트하는 방법입니다.

## 📋 현재 설정 정보

- **새 서버 IP**: 15.164.202.209
- **도메인**: 청해.com (한글 도메인)
- **퓨니코드**: xn--ox6bo4n.com
- **실제 URL**: https://xn--ox6bo4n.com

## 🛠️ Google Cloud Console 설정

### 1. Google Cloud Console 접속
1. https://console.cloud.google.com 접속
2. 기존 프로젝트 선택 (Pure Ocean Platform)

### 2. OAuth 2.0 클라이언트 ID 수정
1. **API 및 서비스** → **사용자 인증 정보** 선택
2. **OAuth 2.0 클라이언트 ID** 클릭 (기존 설정된 것)
3. **승인된 리디렉션 URI** 섹션에서 **URI 추가**:

#### 추가할 URI들 (퓨니코드 사용):
```
https://xn--ox6bo4n.com/api/auth/callback/google
https://www.xn--ox6bo4n.com/api/auth/callback/google
http://15.164.202.209/api/auth/callback/google
https://15.164.202.209/api/auth/callback/google
```

#### 기존 URI는 유지:
```
http://localhost:3000/api/auth/callback/google (개발용)
```

### 3. 승인된 JavaScript 원본 추가
**승인된 JavaScript 원본** 섹션에 추가:
```
https://청해.com
https://www.청해.com
http://15.164.202.209
https://15.164.202.209
```

## 🔑 환경변수 확인

서버에 다음 환경변수가 설정되었는지 확인:

```bash
# /var/www/pure-ocean/.env.production
NEXTAUTH_URL=https://청해.com
GOOGLE_CLIENT_ID=your-actual-client-id
GOOGLE_CLIENT_SECRET=your-actual-client-secret
NEXTAUTH_SECRET=production-secret-key-very-secure-2024
```

## 🌐 DNS 설정 필요사항

### A 레코드 설정
DNS 관리 패널에서 다음 설정 추가:
```
청해.com        A    15.164.202.209
www.청해.com    A    15.164.202.209
```

## 🔒 SSL 인증서 설정

DNS 설정이 완료된 후 서버에서 실행:

```bash
# Let's Encrypt 인증서 발급
sudo certbot --nginx -d 청해.com -d www.청해.com

# 자동 갱신 확인
sudo certbot renew --dry-run
```

## 📝 단계별 체크리스트

### ✅ 완료된 작업
- [x] 서버 IP 변경 (15.164.202.209)
- [x] 환경변수 업데이트
- [x] PM2 애플리케이션 재시작
- [x] GitHub Actions 배포 설정 업데이트

### ⏳ 필요한 작업

#### 1. DNS 설정 (사용자가 직접 해야 함)
- [ ] 청해.com A 레코드 → 15.164.202.209
- [ ] www.청해.com A 레코드 → 15.164.202.209

#### 2. Google OAuth 업데이트 (사용자가 직접 해야 함)
- [ ] Google Cloud Console에서 리디렉션 URI 추가
- [ ] JavaScript 원본 추가
- [ ] 실제 CLIENT_ID와 CLIENT_SECRET을 환경변수에 설정

#### 3. SSL 인증서 설정 (DNS 완료 후)
```bash
ssh -i "POProject.pem" ubuntu@15.164.202.209
sudo certbot --nginx -d 청해.com -d www.청해.com
```

## 🧪 테스트 방법

### 1. 기본 접속 테스트
```bash
# HTTP 접속 (DNS 설정 후)
curl -I http://청해.com

# HTTPS 접속 (SSL 설정 후)  
curl -I https://청해.com
```

### 2. OAuth 로그인 테스트
1. https://청해.com 접속
2. "로그인" 버튼 클릭
3. Google 계정으로 로그인 시도
4. wando.hs.kr 이메일로만 접근 가능한지 확인

### 3. 챗봇 컨텍스트 테스트
1. 로그인 후 챗봇과 대화 시작
2. 여러 메시지 교환
3. GROW/프로젝트 도우미/문서 첨삭 탭 전환
4. 이전 대화 내용이 유지되는지 확인

## 🚨 문제 해결

### Google OAuth 오류
```
Error: redirect_uri_mismatch
```
- Google Cloud Console에서 리디렉션 URI가 정확한지 확인
- NEXTAUTH_URL 환경변수가 올바른지 확인

### SSL 인증서 오류
```
Error: DNS resolution failed
```
- DNS 설정이 전파될 때까지 대기 (최대 48시간)
- `nslookup 청해.com`으로 DNS 확인

### 대화 컨텍스트 문제
- PM2 로그 확인: `pm2 logs pure-ocean-platform`
- 데이터베이스 연결 확인
- max_tokens 설정 확인 (1000으로 증가됨)

## 💡 추가 개선사항

### 1. 도메인 보안
- HSTS 설정 활성화
- Content Security Policy 강화

### 2. 성능 최적화  
- CDN 설정 고려
- 이미지 최적화

### 3. 모니터링
- 서버 상태 모니터링
- 사용자 활동 분석

---

**설정 완료 후 챗봇 컨텍스트 기억 기능이 정상 작동합니다!** 🎉