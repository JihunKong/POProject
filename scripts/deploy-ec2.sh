#!/bin/bash

# EC2 배포 스크립트 for Pure Ocean Platform
# Server: 15.164.202.209
# Domain: https://xn--ox6bo4n.com

set -e

echo "🚀 Starting EC2 deployment for Pure Ocean Platform..."

# 환경 변수 체크
if [ ! -f "POProject.pem" ]; then
    echo "❌ POProject.pem 키 파일이 없습니다. 프로젝트 루트에 위치해주세요."
    exit 1
fi

# PEM 키 권한 설정
chmod 600 POProject.pem

# 서버 정보
EC2_USER="ubuntu"
EC2_HOST="15.164.202.209"
EC2_KEY="POProject.pem"
REMOTE_DIR="/home/ubuntu/pure-ocean"
PM2_APP_NAME="pure-ocean-app"

echo "📦 Building application..."
npm run build

echo "📁 Creating deployment package..."
# 배포에 필요한 파일들만 압축
tar -czf deploy.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=.next/cache \
    --exclude=*.log \
    --exclude=POProject.pem \
    --exclude=.env.local \
    .next \
    public \
    package.json \
    package-lock.json \
    prisma \
    .env

echo "🔄 Uploading to EC2 server..."
scp -i $EC2_KEY deploy.tar.gz $EC2_USER@$EC2_HOST:/tmp/

echo "🚀 Deploying on EC2 server..."
ssh -i $EC2_KEY $EC2_USER@$EC2_HOST << 'EOF'
    echo "🏗️  Setting up deployment directory..."
    mkdir -p /home/ubuntu/pure-ocean
    cd /home/ubuntu/pure-ocean
    
    echo "📦 Extracting files..."
    tar -xzf /tmp/deploy.tar.gz
    rm /tmp/deploy.tar.gz
    
    echo "📚 Installing dependencies..."
    npm ci --only=production
    
    echo "🗄️  Setting up database..."
    npx prisma generate
    npx prisma db push --accept-data-loss
    
    echo "🔄 Restarting application with PM2..."
    pm2 delete pure-ocean-app || true
    pm2 start npm --name "pure-ocean-app" -- start
    pm2 save
    
    echo "✅ Deployment completed!"
    pm2 status
EOF

echo "🧹 Cleaning up..."
rm deploy.tar.gz

echo "✅ EC2 deployment completed successfully!"
echo "🌐 Website: https://xn--ox6bo4n.com"
echo "🖥️  Server: $EC2_HOST"