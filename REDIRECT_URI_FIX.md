# Redirect URI 문제 해결 가이드

## 현재 상황
- 접속 URL: https://xn--ox6bo4n.com (청해.com의 Punycode)
- 오류: redirect_uri_mismatch
- 원인: Google OAuth와 Railway 설정 불일치

## 해결 방법

### 1. Railway 환경 변수 설정
Railway 대시보드 → Variables에서:

```bash
NEXTAUTH_URL=https://xn--ox6bo4n.com
```

또는 www 사용 시:
```bash
NEXTAUTH_URL=https://www.xn--ox6bo4n.com
```

### 2. Google Cloud Console 설정

#### 승인된 JavaScript 원본:
```
https://xn--ox6bo4n.com
https://www.xn--ox6bo4n.com
https://청해.com
https://www.청해.com
```

#### 승인된 리디렉션 URI:
```
https://xn--ox6bo4n.com/api/auth/callback/google
https://www.xn--ox6bo4n.com/api/auth/callback/google
https://청해.com/api/auth/callback/google
https://www.청해.com/api/auth/callback/google
```

### 3. 도메인 접속 테스트

다음 URL들로 접속 테스트:
1. https://xn--ox6bo4n.com
2. https://www.xn--ox6bo4n.com
3. https://청해.com
4. https://www.청해.com

어느 것이 작동하는지 확인하고, 그에 맞춰 설정

### 4. 디버깅 방법

브라우저 개발자 도구(F12) → Network 탭에서:
1. Google 로그인 시도
2. `authorize` 요청 찾기
3. Query Parameters에서 `redirect_uri` 값 확인
4. 이 값이 Google Console에 등록된 값과 정확히 일치하는지 확인

### 5. 일반적인 문제들

#### 문제: 후행 슬래시
- 등록: `https://xn--ox6bo4n.com/api/auth/callback/google`
- 실제: `https://xn--ox6bo4n.com/api/auth/callback/google/`
- 해결: 후행 슬래시 있는 것과 없는 것 모두 등록

#### 문제: 프로토콜 불일치
- 등록: `https://`
- 실제: `http://`
- 해결: HTTPS 강제 사용

#### 문제: 인코딩 불일치
- 한글 도메인과 Punycode가 다르게 처리됨
- 두 가지 모두 등록 필요

### 6. 임시 해결책

도메인 설정이 복잡하다면:
1. Railway 기본 URL 사용: `https://poproject-production.up.railway.app`
2. 이 URL로 모든 설정 통일
3. 도메인은 나중에 설정