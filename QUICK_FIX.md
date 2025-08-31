# 빠른 해결 방법

## EC2 배포 URL 사용하기

### 1. EC2 환경 변수 설정
```
NEXTAUTH_URL=http://ec2-15-164-169-201.ap-northeast-2.compute.amazonaws.com:3000
```

### 2. Google OAuth 설정
승인된 리디렉션 URI:
```
http://ec2-15-164-169-201.ap-northeast-2.compute.amazonaws.com:3000/api/auth/callback/google
```

### 3. 접속
```
http://ec2-15-164-169-201.ap-northeast-2.compute.amazonaws.com:3000
```

## 커스텀 도메인 사용하기 (선택사항)

### 도메인 연결 후
1. EC2 환경 변수:
   ```
   NEXTAUTH_URL=https://yourdomain.com
   ```

2. Google OAuth 리디렉션 URI:
   ```
   https://yourdomain.com/api/auth/callback/google
   ```

3. SSL 인증서 설정 (Let's Encrypt 권장)

## 디버깅 체크리스트

- [ ] EC2 보안 그룹에서 포트 3000이 열려있는가?
- [ ] PM2로 애플리케이션이 실행 중인가?
- [ ] NEXTAUTH_URL이 접속 URL과 일치하는가?
- [ ] Google OAuth에 정확한 URI가 등록되어 있는가?
- [ ] 브라우저 캐시를 지웠는가?
- [ ] 데이터베이스 연결이 정상적인가?

## 권장사항

1. 일단 EC2 Public URL로 서비스 운영
2. 나중에 도메인 연결 및 SSL 인증서 설정 고려
3. 정기적인 백업 및 모니터링 설정