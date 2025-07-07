# OAuth Redirect URI 디버깅 가이드

## 오류 원인 확인

### 1. 브라우저 개발자 도구에서 확인
1. F12를 눌러 개발자 도구 열기
2. Network 탭으로 이동
3. Google 로그인 시도
4. `authorize` 요청 찾기
5. Query Parameters에서 `redirect_uri` 값 확인

### 2. 일반적인 문제들

#### 문제 1: 프로토콜 불일치
- 등록: `https://청해.com/api/auth/callback/google`
- 실제: `http://청해.com/api/auth/callback/google`
- 해결: HTTPS 강제 설정

#### 문제 2: 도메인 인코딩
- 등록: `https://청해.com/api/auth/callback/google`
- 실제: `https://xn--ox6bo4n.com/api/auth/callback/google`
- 해결: 두 가지 모두 등록

#### 문제 3: www 유무
- 등록: `https://청해.com/api/auth/callback/google`
- 실제: `https://www.청해.com/api/auth/callback/google`
- 해결: 두 가지 모두 등록

#### 문제 4: 후행 슬래시
- 등록: `https://청해.com/api/auth/callback/google`
- 실제: `https://청해.com/api/auth/callback/google/`
- 해결: 후행 슬래시 제거

## Railway 환경 변수 설정

정확한 도메인으로 설정:
```
NEXTAUTH_URL=https://청해.com
```

또는 www 사용 시:
```
NEXTAUTH_URL=https://www.청해.com
```

## 코드 레벨 수정

필요하다면 NextAuth 설정에 redirect URI 명시:

```typescript
Google({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  authorization: {
    params: {
      scope: 'openid email profile',
      prompt: 'select_account',
      // 명시적 redirect_uri 설정
      redirect_uri: process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    },
  },
})
```

## 테스트 방법

1. 시크릿 모드에서 테스트
2. 다른 브라우저에서 테스트
3. 캐시 및 쿠키 삭제 후 테스트

## 임시 해결책

도메인 설정이 완료될 때까지:
1. Railway 기본 URL 사용: `https://poproject-production.up.railway.app`
2. 이 URL로 Google OAuth 설정
3. 도메인 DNS 전파 완료 후 전환