# 학생 접속 문제 해결 가이드

## Google Cloud Console 설정 확인사항

### 1. OAuth 동의 화면 설정
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. **API 및 서비스** → **OAuth 동의 화면**
3. 다음 설정 확인:

#### 앱 정보
- **앱 이름**: Pure Ocean Chatbot (또는 설정한 이름)
- **사용자 지원 이메일**: 유효한 이메일
- **앱 도메인**: https://poproject-production.up.ec2-domain.com
- **개인정보처리방침**: 선택사항이지만 있으면 좋음
- **서비스 약관**: 선택사항

#### 중요 설정
- **게시 상태**: **프로덕션** (반드시 확인!)
- **사용자 유형**: **외부** (모든 Google 계정 허용)
- **연령 제한**: 설정하지 않음 또는 최소 연령

### 2. OAuth 2.0 클라이언트 ID 설정
1. **사용자 인증 정보** → OAuth 2.0 클라이언트 ID 클릭
2. 다음 URI들이 정확히 포함되어 있는지 확인:

**승인된 JavaScript 원본**:
```
https://poproject-production.up.ec2-domain.com
```

**승인된 리디렉션 URI**:
```
https://poproject-production.up.ec2-domain.com/api/auth/callback/google
```

### 3. API 할당량 확인
- **API 및 서비스** → **할당량**
- Google+ API 또는 Google Identity 할당량 확인
- 일일 요청 한도에 도달했는지 확인

## 학생들을 위한 트러블슈팅

### 접속이 안 되는 학생들에게 안내할 사항:

1. **다른 브라우저 사용**
   - Chrome (권장)
   - Edge
   - Safari

2. **브라우저 설정 확인**
   - 쿠키 허용
   - JavaScript 활성화
   - 팝업 차단 해제 (일시적)

3. **Google 계정 설정**
   - https://myaccount.google.com/permissions 접속
   - "제3자 앱 액세스" 확인
   - 차단된 앱이 있다면 해제

4. **시도해볼 방법들**
   - 모든 Google 계정 로그아웃 후 재시도
   - 시크릿/프라이빗 모드 사용
   - 캐시 및 쿠키 삭제
   - 다른 기기(스마트폰 등)에서 시도

5. **대안 계정 사용**
   - 다른 Gmail 계정 시도
   - 가족 계정으로 테스트
   - 새 Gmail 계정 생성 (만 14세 이상으로)

## 코드 레벨 해결책 (이미 적용됨)

1. **최소 권한 요청**: `openid email profile`만 요청
2. **계정 선택 화면**: `prompt: 'select_account'`로 설정
3. **도메인 제한 제거**: 모든 Google 계정 허용

## 추가 확인사항

### Google Workspace 관리자 설정 (학교 계정의 경우)
학교 Google Workspace 관리자가 다음을 차단했을 수 있음:
- 제3자 앱 접근
- 특정 도메인 접근
- OAuth 앱 허용 목록

### 네트워크 레벨 차단
- 학교 네트워크 방화벽
- ISP 레벨 차단
- 국가별 제한

## 최종 해결책

만약 위의 모든 방법이 실패한다면:

1. **오류 로그 수집**
   - 브라우저 콘솔 오류 (F12)
   - 정확한 오류 메시지
   - 스크린샷

2. **Google Cloud Support**
   - OAuth 관련 이슈 문의
   - 특정 계정 차단 이유 확인

3. **대안 인증 방법 고려**
   - 이메일 링크 인증
   - 초대 코드 방식
   - 익명 사용 후 계정 연결