# 문제 해결 체크리스트

## "Bad Request" 오류 해결

### 1. 환경 변수 확인
- [ ] NEXTAUTH_URL이 설정되어 있는가?
- [ ] NEXTAUTH_URL이 https://로 시작하는가?
- [ ] NEXTAUTH_URL에 후행 슬래시(/)가 없는가?
- [ ] NEXTAUTH_SECRET이 설정되어 있는가?
- [ ] GOOGLE_CLIENT_ID가 설정되어 있는가?
- [ ] GOOGLE_CLIENT_SECRET이 설정되어 있는가?

### 2. 올바른 환경 변수 예시
```
NEXTAUTH_URL=https://xn--ox6bo4n.com
(NOT: https://xn--ox6bo4n.com/)
(NOT: http://xn--ox6bo4n.com)
(NOT: xn--ox6bo4n.com)
```

### 3. 테스트 URL
1. API 테스트: https://xn--ox6bo4n.com/api/test
2. 디버그 정보: https://xn--ox6bo4n.com/api/auth/debug
3. 홈페이지: https://xn--ox6bo4n.com

### 4. Google OAuth 설정 확인
- [ ] 앱이 "프로덕션" 모드인가?
- [ ] 리디렉션 URI가 정확히 등록되어 있는가?
- [ ] OAuth 클라이언트가 "웹 애플리케이션" 타입인가?

### 5. Railway 설정 확인
- [ ] Custom Domain이 Active 상태인가?
- [ ] SSL 인증서가 발급되었는가?
- [ ] 환경 변수가 저장되었는가? (Save 버튼 클릭)

### 6. 일반적인 실수들
1. **환경 변수 오타**
   - NEXTAUTH_URL (NOT: NEXT_AUTH_URL)
   - NEXTAUTH_SECRET (NOT: NEXTAUTH_SECRET_KEY)

2. **URL 형식**
   - 올바름: https://xn--ox6bo4n.com
   - 틀림: https://xn--ox6bo4n.com/
   - 틀림: http://xn--ox6bo4n.com
   - 틀림: www.xn--ox6bo4n.com

3. **시크릿 키**
   - 최소 32자 이상
   - 특수문자 포함 가능
   - 공백 없음

### 7. 디버깅 순서
1. /api/test 접속 → API 작동 확인
2. /api/auth/debug 접속 → 환경 변수 확인
3. 홈페이지 접속 → 전체 앱 확인
4. 로그인 시도 → OAuth 확인