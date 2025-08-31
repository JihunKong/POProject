# Pure Ocean Project - Google Cloud 설정 가이드

## 새 Google Cloud 프로젝트 생성 (권장)

### 1. 프로젝트 생성
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 상단 프로젝트 선택 드롭다운 → **새 프로젝트**
3. 프로젝트 정보:
   - 프로젝트 이름: `Pure Ocean Chatbot`
   - 프로젝트 ID: 자동 생성 (예: pure-ocean-chatbot-xxxxx)

### 2. API 활성화
1. **API 및 서비스** → **사용 설정된 API**
2. **+ API 및 서비스 사용 설정** 클릭
3. 검색 및 활성화:
   - Google+ API
   - Google Identity Toolkit API

### 3. OAuth 동의 화면 설정
1. **API 및 서비스** → **OAuth 동의 화면**
2. 사용자 유형: **외부** 선택
3. 앱 정보 입력:
   ```
   앱 이름: Pure Ocean Chatbot
   사용자 지원 이메일: [교사 이메일]
   앱 로고: (선택사항)
   
   앱 도메인:
   - 앱 홈페이지: https://poproject-production.up.ec2-domain.com
   - 개인정보처리방침: https://poproject-production.up.ec2-domain.com/privacy
   - 서비스 약관: https://poproject-production.up.ec2-domain.com/terms
   
   승인된 도메인:
   - poproject-production.up.ec2-domain.com
   - ec2-domain.com (상위 도메인)
   
   개발자 연락처: [교사 이메일]
   ```

4. 범위(Scopes):
   - 기본 범위만 유지 (email, profile, openid)
   - 민감한 범위 추가하지 않음

5. 테스트 사용자:
   - 건너뛰기 (프로덕션으로 바로 게시할 예정)

6. 요약 확인 후 **저장**

### 4. OAuth 2.0 클라이언트 ID 생성
1. **사용자 인증 정보** → **+ 사용자 인증 정보 만들기**
2. **OAuth 클라이언트 ID** 선택
3. 애플리케이션 유형: **웹 애플리케이션**
4. 설정:
   ```
   이름: Pure Ocean Web Client
   
   승인된 JavaScript 원본:
   - https://poproject-production.up.ec2-domain.com
   - http://localhost:3000 (개발용)
   
   승인된 리디렉션 URI:
   - https://poproject-production.up.ec2-domain.com/api/auth/callback/google
   - http://localhost:3000/api/auth/callback/google (개발용)
   ```

5. **만들기** → 클라이언트 ID와 시크릿 복사

### 5. 앱을 프로덕션으로 게시
1. **OAuth 동의 화면** → **앱 게시** 버튼
2. 확인 대화상자에서 **확인**
3. 게시 상태가 "프로덕션"으로 변경 확인

### 6. EC2 환경 변수 업데이트
새로 생성한 OAuth 정보로 업데이트:
```
GOOGLE_CLIENT_ID=[새 클라이언트 ID]
GOOGLE_CLIENT_SECRET=[새 클라이언트 시크릿]
```

## 기존 프로젝트 사용 시 (대안)

만약 새 프로젝트를 만들기 어렵다면:

1. **OAuth 동의 화면** 수정:
   - 앱 도메인을 ec2-domain.com 도메인으로 변경
   - 승인된 도메인에 추가

2. **여러 도메인 지원**:
   - OAuth 클라이언트 ID 설정에서 여러 도메인 추가 가능
   - classapphub.com과 ec2-domain.com 모두 추가

## 주의사항

- 도메인 불일치는 보안 경고의 주요 원인
- 교육 목적의 앱은 Google 검증 없이 사용 가능
- 민감한 스코프를 요청하지 않으면 추가 검증 불필요

## 확인 방법

설정 완료 후:
1. 시크릿 모드에서 테스트
2. 다른 Gmail 계정으로 로그인 시도
3. 100명 제한 메시지가 나타나지 않는지 확인