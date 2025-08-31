# Cloudflare를 통한 도메인 설정 가이드

## Cloudflare 사용 이유
- 루트 도메인에 CNAME 설정 가능 (CNAME Flattening)
- 무료 SSL 인증서
- DDoS 보호
- 캐싱으로 성능 향상

## 설정 단계

### 1. Cloudflare 계정 생성
1. https://www.cloudflare.com 접속
2. 무료 계정 생성

### 2. 도메인 추가
1. **Add a Site** 클릭
2. `청해.com` 또는 `xn--ox6bo4n.com` 입력
3. Free 플랜 선택

### 3. DNS 레코드 설정
Cloudflare DNS 관리에서:

```
Type: CNAME
Name: @
Content: poproject-production.up.ec2-domain.com
Proxy status: Proxied (주황색 구름)
TTL: Auto
```

```
Type: CNAME
Name: www
Content: poproject-production.up.ec2-domain.com
Proxy status: Proxied (주황색 구름)
TTL: Auto
```

### 4. 네임서버 변경
1. Cloudflare가 제공하는 네임서버 확인
2. 도메인 등록업체에서 네임서버 변경:
   - 기존 네임서버 삭제
   - Cloudflare 네임서버 추가

### 5. SSL/TLS 설정
Cloudflare 대시보드에서:
1. **SSL/TLS** → **Overview**
2. **Full (strict)** 선택

### 6. 페이지 규칙 (선택사항)
항상 HTTPS 사용:
1. **Rules** → **Page Rules**
2. **Create Page Rule**
3. URL: `http://*청해.com/*`
4. Setting: **Always Use HTTPS**

## 환경 변수 업데이트

EC2에서:
```
NEXTAUTH_URL=https://청해.com
```

또는 Punycode 사용:
```
NEXTAUTH_URL=https://xn--ox6bo4n.com
```

## 확인 사항
- DNS 전파: 5분-24시간
- SSL 인증서 자동 발급
- 한글/Punycode 모두 작동 확인