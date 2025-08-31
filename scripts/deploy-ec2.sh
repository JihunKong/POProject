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
    src \
    public \
    package.json \
    package-lock.json \
    prisma \
    next.config.js \
    tailwind.config.ts \
    postcss.config.js \
    tsconfig.json \
    scripts/setup-postgresql-ec2.sh \
    server-production.js \
    ecosystem.config.js \
    nginx-pure-ocean.conf \
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
    
    echo "🗄️  Setting up PostgreSQL database..."
    chmod +x scripts/setup-postgresql-ec2.sh
    ./scripts/setup-postgresql-ec2.sh
    
    echo "📚 Installing and updating dependencies..."
    npm ci
    
    echo "🔒 Applying security updates..."
    npm audit fix --force
    
    echo "✅ Dependencies installed and secured"
    
    echo "🔄 Generating Prisma client and applying schema..."
    npx prisma generate
    npx prisma db push --accept-data-loss
    
    echo "🔄 Setting up secure logging directories..."
    sudo mkdir -p /var/log/pure-ocean
    sudo chown ubuntu:ubuntu /var/log/pure-ocean
    sudo chmod 750 /var/log/pure-ocean
    
    echo "🔄 Setting up Nginx configuration..."
    sudo mkdir -p /var/log/nginx
    sudo cp nginx-pure-ocean.conf /etc/nginx/sites-available/pure-ocean
    sudo ln -sf /etc/nginx/sites-available/pure-ocean /etc/nginx/sites-enabled/
    
    # Remove default nginx site to avoid conflicts
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload nginx
    sudo nginx -t && sudo systemctl reload nginx
    
    echo "🔄 Restarting application with PM2 (WebSocket optimized)..."
    
    # WebSocket 연결 정리를 위해 완전 종료 후 재시작
    echo "Stopping existing PM2 processes..."
    pm2 delete pure-ocean-app 2>/dev/null || echo "No existing process found"
    
    # 포트가 사용 중인지 확인하고 정리
    echo "Checking port availability..."
    sudo lsof -ti:3000 | xargs sudo kill -9 2>/dev/null || echo "Port 3000 is free"
    
    # 잠시 대기 (소켓 정리 및 포트 해제)
    echo "Waiting for socket cleanup..."
    sleep 10
    
    # 새로운 설정으로 시작
    echo "Starting application with new configuration..."
    pm2 start ecosystem.config.js
    pm2 save
    
    # PM2 startup 설정
    pm2 startup systemd -u ubuntu --hp /home/ubuntu
    sudo env PATH=$PATH:/home/ubuntu/.nvm/versions/node/$(node -v)/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
    
    # 애플리케이션 시작 대기
    echo "Waiting for application to initialize..."
    sleep 10
    
    echo "✅ Deployment completed!"
    echo "📊 PM2 Status:"
    pm2 status
    echo "📝 Recent logs:"
    pm2 logs pure-ocean-app --lines 15 --nostream
EOF

echo "🧹 Cleaning up..."
rm deploy.tar.gz

echo "✅ EC2 deployment completed successfully!"
echo "🌐 Website: https://xn--ox6bo4n.com"
echo "🖥️  Server: $EC2_HOST"