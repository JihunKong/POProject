# 청해.com 도메인 소유권 확인 가이드

## 1단계: Google Search Console 설정

### 1. Search Console 접속
- https://search.google.com/search-console
- Google 계정으로 로그인 (OAuth 앱을 만든 계정)

### 2. 속성 추가
- **속성 추가** 클릭
- **도메인** 옵션 선택
- `청해.com` 입력 (또는 `xn--ox6bo4n.com`)

### 3. DNS 확인 방법 선택
Google이 제공하는 TXT 레코드:
```
TXT record
Name: @ 또는 빈칸
Value: google-site-verification=1234567890abcdef...
TTL: 3600 또는 1시간
```

## 2단계: 도메인 등록업체에서 TXT 레코드 추가

### 가비아의 경우:
1. My가비아 → 도메인 관리
2. DNS 관리 → DNS 설정
3. 레코드 추가:
   - 타입: TXT
   - 호스트: @ 또는 빈칸
   - 값: google-site-verification=... (Google이 제공한 전체 값)
   - TTL: 3600

### 후이즈의 경우:
1. 도메인 관리 → DNS 관리
2. TXT 레코드 추가
3. 위와 동일하게 입력

### Hosting.kr의 경우:
1. 도메인 관리 → DNS 설정
2. TXT 레코드 추가
3. 위와 동일하게 입력

## 3단계: 소유권 확인

1. DNS 레코드 추가 후 5-10분 대기
2. Google Search Console에서 **확인** 클릭
3. 성공 메시지 확인

## 4단계: Google Cloud Console 업데이트

소유권 확인 후:

1. [Google Cloud Console](https://console.cloud.google.com)
2. OAuth 동의 화면 → 앱 정보 수정
3. 홈페이지 URL 확인:
   - `https://청해.com`
   - 또는 `https://www.청해.com`

## 추가 확인 사항

### HTML 파일 방법 (대안)
DNS 방법이 안 되면:

1. Google이 제공하는 HTML 파일 다운로드
2. 파일을 `/public` 폴더에 추가
3. 배포 후 `https://청해.com/google1234567890.html` 접근 가능 확인
4. Google Search Console에서 확인

### Meta 태그 방법 (코드 수정 필요)
`src/app/layout.tsx`에서:
```typescript
export const metadata: Metadata = {
  title: "Pure-Ocean Project - AI 챗봇",
  description: "완도고등학교 Pure-Ocean Project를 위한 소크라테스식 AI 코칭 챗봇",
  verification: {
    google: "실제_인증_코드_입력", // 예: "1234567890abcdef"
  },
};
```

## 문제 해결

### DNS 전파 시간
- 일반적으로 5-30분
- 최대 48시간까지 걸릴 수 있음
- https://dnschecker.org 에서 확인 가능

### 한글 도메인 이슈
- `청해.com`과 `xn--ox6bo4n.com` 모두 시도
- 일부 시스템은 Punycode만 인식

### 여러 속성 추가
필요하다면 모두 추가:
- `청해.com`
- `www.청해.com`
- `xn--ox6bo4n.com`
- `www.xn--ox6bo4n.com`

## 완료 후

1. Google OAuth 앱 검증 재신청
2. 홈페이지 요구사항 통과 확인
3. 100명 제한 해제 확인