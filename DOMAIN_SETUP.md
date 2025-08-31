# 도메인 설정 가이드

## Google OAuth 검증을 위한 도메인 설정

### 옵션 1: 무료 도메인 사용

1. **Freenom** (무료 .tk, .ml 도메인)
   - https://www.freenom.com
   - 예: `pureocean.tk`

2. **GitHub Pages + Custom Domain**
   - GitHub Pages로 간단한 랜딩 페이지 호스팅
   - EC2 앱으로 리디렉션

### 옵션 2: 유료 도메인 구매 (권장)

1. **도메인 구매처**
   - Namecheap: 연 $10-15
   - Google Domains: 연 $12
   - 가비아 (한국): 연 15,000원

2. **추천 도메인 이름**
   - `pureocean.education`
   - `pureocean-chatbot.com`
   - `wando-pureocean.com`

### EC2에 도메인 연결하기

1. EC2 대시보드에서 서비스 선택
2. **Settings** → **Domains**
3. **+ Custom Domain** 클릭
4. 도메인 입력 (예: `pureocean.education`)
5. 제공된 DNS 설정을 도메인 등록업체에 적용

### DNS 설정 예시

```
Type: CNAME
Name: @ (또는 www)
Value: [EC2가 제공하는 값]
TTL: 3600
```

### SSL 인증서

- EC2가 자동으로 Let's Encrypt SSL 인증서 발급
- HTTPS가 자동으로 활성화됨

## Google OAuth 업데이트

도메인 연결 후:

1. **OAuth 동의 화면**
   - 홈페이지: `https://[your-domain].com`
   - 개인정보처리방침: `https://[your-domain].com/privacy`
   - 서비스 약관: `https://[your-domain].com/terms`

2. **OAuth 클라이언트 ID**
   - 승인된 JavaScript 원본에 새 도메인 추가
   - 승인된 리디렉션 URI 업데이트

3. **EC2 환경 변수**
   - `NEXTAUTH_URL=https://[your-domain].com`

## 임시 해결책

도메인 구매 전까지:

1. **개발 모드 유지**
   - OAuth 앱을 테스트 모드로 유지
   - 100명 제한 수용

2. **Google Forms 활용**
   - 추가 사용자 신청 받기
   - 수동으로 테스트 사용자 추가

3. **대체 인증 방법**
   - 초대 코드 시스템
   - 이메일 매직 링크