#!/bin/bash

# PostgreSQL 설정 스크립트 for Pure Ocean Platform on EC2
# Server: 15.164.202.209
# Domain: https://xn--ox6bo4n.com

set -e

echo "🗄️  Setting up PostgreSQL on EC2..."

# PostgreSQL 설치 확인 및 설치
if ! command -v psql &> /dev/null; then
    echo "📦 Installing PostgreSQL..."
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
else
    echo "✅ PostgreSQL is already installed"
fi

# PostgreSQL 서비스 시작 및 활성화
sudo systemctl start postgresql
sudo systemctl enable postgresql

echo "👤 Setting up database user and database..."

# PostgreSQL 사용자와 데이터베이스 생성
sudo -u postgres psql << 'EOF'
-- 데이터베이스가 이미 존재하는지 확인하고 없으면 생성
SELECT 'CREATE DATABASE pure_ocean'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pure_ocean')\gexec

-- 사용자가 이미 존재하는지 확인하고 없으면 생성
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'postgres') THEN
      
      CREATE ROLE postgres LOGIN PASSWORD 'pure_ocean_secure_2025';
   END IF;
END
$do$;

-- 사용자에게 데이터베이스 권한 부여
ALTER USER postgres WITH SUPERUSER;
GRANT ALL PRIVILEGES ON DATABASE pure_ocean TO postgres;

-- 연결 테스트
\c pure_ocean
SELECT 'PostgreSQL setup completed successfully!' as status;
\q
EOF

echo "🔒 Configuring PostgreSQL security..."

# PostgreSQL 설정 파일 경로 찾기
PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | awk '{print $2}' | cut -d. -f1,2)
PG_CONFIG_DIR="/etc/postgresql/$PG_VERSION/main"

# pg_hba.conf 백업 생성
sudo cp $PG_CONFIG_DIR/pg_hba.conf $PG_CONFIG_DIR/pg_hba.conf.backup

# pg_hba.conf 설정 업데이트 (로컬 연결 허용)
sudo tee $PG_CONFIG_DIR/pg_hba.conf > /dev/null << 'EOF'
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# "local" is for Unix domain socket connections only
local   all             all                                     peer
local   all             postgres                                md5

# IPv4 local connections:
host    all             all             127.0.0.1/32            md5
host    pure_ocean      postgres        127.0.0.1/32            md5

# IPv6 local connections:
host    all             all             ::1/128                 md5

# Allow replication connections from localhost
local   replication     all                                     peer
host    replication     all             127.0.0.1/32            md5
host    replication     all             ::1/128                 md5
EOF

# postgresql.conf 백업 생성
sudo cp $PG_CONFIG_DIR/postgresql.conf $PG_CONFIG_DIR/postgresql.conf.backup

# postgresql.conf 설정 업데이트
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" $PG_CONFIG_DIR/postgresql.conf
sudo sed -i "s/#port = 5432/port = 5432/" $PG_CONFIG_DIR/postgresql.conf

echo "🔄 Restarting PostgreSQL..."
sudo systemctl restart postgresql

echo "🔍 Testing database connection..."

# 연결 테스트
export PGPASSWORD='pure_ocean_secure_2025'
if psql -h localhost -U postgres -d pure_ocean -c "SELECT 'Connection successful!' as test;"; then
    echo "✅ Database connection test passed!"
else
    echo "❌ Database connection test failed!"
    exit 1
fi

echo "📊 PostgreSQL status:"
sudo systemctl status postgresql --no-pager

echo "🗄️  Database setup summary:"
echo "  Database: pure_ocean"
echo "  User: postgres"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Connection URL: postgresql://postgres:pure_ocean_secure_2025@localhost:5432/pure_ocean"

echo "✅ PostgreSQL setup completed successfully!"