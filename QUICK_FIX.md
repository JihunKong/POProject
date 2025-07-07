# 빠른 해결 방법

## Railway 기본 URL 사용하기

### 1. Railway 환경 변수 수정
```
NEXTAUTH_URL=https://poproject-production.up.railway.app
```

### 2. Google OAuth 설정
승인된 리디렉션 URI:
```
https://poproject-production.up.railway.app/api/auth/callback/google
```

### 3. 접속
```
https://poproject-production.up.railway.app
```

## 청해.com 도메인 사용하기 (복잡함)

### 옵션 A: Punycode 사용
1. Railway 환경 변수:
   ```
   NEXTAUTH_URL=https://xn--ox6bo4n.com
   ```

2. Google OAuth 리디렉션 URI:
   ```
   https://xn--ox6bo4n.com/api/auth/callback/google
   ```

### 옵션 B: 한글 도메인 사용
1. Railway 환경 변수:
   ```
   NEXTAUTH_URL=https://청해.com
   ```

2. Google OAuth 리디렉션 URI:
   ```
   https://청해.com/api/auth/callback/google
   https://xn--ox6bo4n.com/api/auth/callback/google
   ```
   (둘 다 추가)

## 디버깅 체크리스트

- [ ] Railway Custom Domain이 Active 상태인가?
- [ ] SSL 인증서가 발급되었는가?
- [ ] NEXTAUTH_URL이 접속 URL과 일치하는가?
- [ ] Google OAuth에 정확한 URI가 등록되어 있는가?
- [ ] 브라우저 캐시를 지웠는가?

## 권장사항

한글 도메인은 여러 문제를 일으킬 수 있으므로:
1. 일단 Railway URL로 서비스 운영
2. 나중에 영문 도메인 구매 고려 (예: pureocean.com)