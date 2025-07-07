# 연령 제한 문제 해결 가이드

## 문제 상황
- 학교 계정 (@wando.hs.kr): ✅ 정상 작동
- 교사 개인 Gmail: ✅ 정상 작동  
- 학생 개인 Gmail: ❌ 일부만 작동

## 원인: Google 연령 제한 정책

### 1. 학생들의 Google 계정 확인
학생들에게 다음을 확인하도록 안내:

1. **계정 연령 확인**
   - https://myaccount.google.com 접속
   - 개인정보 → 생년월일 확인
   - 만 14세 이상인지 확인

2. **Family Link 제한 확인**
   - 부모가 Family Link로 관리하는 계정인 경우
   - 제3자 앱 접근이 제한될 수 있음

### 2. Google Cloud Console 설정 수정

OAuth 동의 화면에서 다음 설정 확인:

1. **연령 제한 설정**
   - OAuth 동의 화면 → 앱 정보
   - "연령 제한" 또는 "Age restrictions" 섹션
   - "모든 연령" 또는 최소 연령 확인

2. **민감한 범위(Sensitive Scopes) 제거**
   - 현재 요청하는 권한 확인
   - 기본 프로필 정보만 요청하도록 수정

### 3. 코드 수정 - 최소 권한만 요청

`src/lib/auth.ts`에서 Google Provider 설정 수정:

```typescript
Google({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  authorization: {
    params: {
      scope: 'openid email profile', // 최소 권한만 요청
      access_type: 'offline',
      prompt: 'consent',
    },
  },
})
```

### 4. 대안 솔루션

1. **학교 계정만 사용하도록 안내**
   - 가장 확실한 해결책
   - 학교 Google Workspace는 연령 제한 없음

2. **교사 계정으로 초대 방식**
   - 교사가 먼저 로그인
   - 학생을 팀/그룹으로 초대하는 방식

3. **익명 사용 옵션 추가**
   - 로그인 없이 제한적 기능 사용
   - 나중에 계정 연결

### 5. 임시 해결책

접속이 안 되는 학생들에게:

1. **계정 설정 확인**
   ```
   https://myaccount.google.com/permissions
   ```
   - "제3자 앱 및 서비스" 섹션 확인
   - 차단된 앱이 있는지 확인

2. **브라우저 설정**
   - 쿠키 및 JavaScript 활성화
   - 광고 차단기 비활성화
   - 시크릿 모드로 시도

3. **다른 계정 시도**
   - 다른 Gmail 계정으로 시도
   - 성인 가족의 계정으로 테스트

## 권장 사항

**학교 프로젝트의 경우 학교 Google Workspace 계정(@wando.hs.kr)만 사용하도록 하는 것이 가장 안전하고 확실한 방법입니다.**