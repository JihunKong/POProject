# 🚨 보안 경고 및 조치 사항

## 즉시 수행해야 할 작업

### 1. Google OAuth 클라이언트 시크릿 재생성
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. API 및 서비스 → 사용자 인증 정보
3. 노출된 OAuth 2.0 클라이언트 찾기
4. 새 클라이언트 시크릿 생성
5. EC2 환경 변수 업데이트

### 2. OpenAI API 키 무효화 및 재생성
1. [OpenAI API Keys](https://platform.openai.com/api-keys) 접속
2. 노출된 키 무효화 (Revoke)
3. 새 API 키 생성
4. EC2 환경 변수 업데이트

### 3. 사용 내역 확인
- Google Cloud Console에서 비정상적인 API 사용 확인
- OpenAI 대시보드에서 비정상적인 사용량 확인

## 향후 예방 조치

### 환경 변수 관리
1. 절대 실제 키를 문서나 코드에 포함하지 않기
2. .env.example 파일 사용 (실제 값 없이)
3. 환경 변수는 배포 플랫폼에서만 설정

### Git 보안
1. .gitignore 항상 확인
2. 커밋 전 민감한 정보 검토
3. git-secrets 같은 도구 사용 고려

### 추가 보안 도구
```bash
# git-secrets 설치 및 설정
brew install git-secrets
git secrets --install
git secrets --register-aws
```

## 긴급 연락처
- Google Cloud Support: https://cloud.google.com/support
- OpenAI Support: support@openai.com

## 노출된 정보
- Google OAuth Client ID: 1087642726073-352h32icfoa4ikkduaa7dojhj74s4bn4.apps.googleusercontent.com
- Google OAuth Secret: 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 (무효화 필요)
- OpenAI API Key: sk-proj-... (무효화 필요)

**이 파일도 민감한 정보를 포함하므로 Git에 커밋하지 마세요!**