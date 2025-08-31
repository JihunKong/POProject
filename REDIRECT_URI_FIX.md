# Redirect URI 문제 해결 가이드

## 현재 상황
- EC2 접속 URL: http://ec2-15-164-169-201.ap-northeast-2.compute.amazonaws.com:3000
- 오류: redirect_uri_mismatch
- 원인: Google OAuth와 EC2 설정 불일치

## 해결 방법

### 1. EC2 환경 변수 설정
EC2 인스턴스의 .env 파일에서:

```bash
NEXTAUTH_URL=http://ec2-15-164-169-201.ap-northeast-2.compute.amazonaws.com:3000
```

### 2. Google Cloud Console 설정

#### 승인된 JavaScript 원본:
```
http://ec2-15-164-169-201.ap-northeast-2.compute.amazonaws.com:3000
http://localhost:3000
```

#### 승인된 리디렉션 URI:
```
http://ec2-15-164-169-201.ap-northeast-2.compute.amazonaws.com:3000/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

### 3. EC2 접속 테스트

1. http://ec2-15-164-169-201.ap-northeast-2.compute.amazonaws.com:3000
2. 로그인 버튼 클릭하여 Google OAuth 테스트

### 4. 디버깅 방법

브라우저 개발자 도구(F12) → Network 탭에서:
1. Google 로그인 시도
2. `authorize` 요청 찾기
3. Query Parameters에서 `redirect_uri` 값 확인
4. 이 값이 Google Console에 등록된 값과 정확히 일치하는지 확인

### 5. 일반적인 문제들

#### 문제: 포트 번호 누락
- 등록: `http://ec2-15-164-169-201.ap-northeast-2.compute.amazonaws.com/api/auth/callback/google`
- 실제: `http://ec2-15-164-169-201.ap-northeast-2.compute.amazonaws.com:3000/api/auth/callback/google`
- 해결: 포트 번호 3000 포함하여 등록

#### 문제: 프로토콜 불일치
- 등록: `https://`
- 실제: `http://`
- 해결: HTTP 프로토콜 사용 (SSL 설정 전까지)

#### 문제: 후행 슬래시
- 등록: `http://ec2-domain.com:3000/api/auth/callback/google`
- 실제: `http://ec2-domain.com:3000/api/auth/callback/google/`
- 해결: 후행 슬래시 있는 것과 없는 것 모두 등록

### 6. 커스텀 도메인 사용 시

도메인을 연결한 경우:
1. `NEXTAUTH_URL=https://yourdomain.com` 설정
2. Google Console에 HTTPS URL 등록
3. SSL 인증서 설정 필요

### 7. PM2 재시작

환경 변수 변경 후:
```bash
pm2 restart all
```