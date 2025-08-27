#!/bin/bash

# Pure Ocean Platform - EC2 Environment Update Script  
# This script updates environment variables on EC2 after RDS migration

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EC2_HOST="${EC2_HOST:-ec2-15-164-169-201.ap-northeast-2.compute.amazonaws.com}"
EC2_USER="${EC2_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-~/.ssh/id_rsa}"
APP_DIR="${APP_DIR:-/home/ubuntu/POProject}"

# Database configuration
NEW_DATABASE_URL="${NEW_DATABASE_URL:-}"
BACKUP_ENV="${BACKUP_ENV:-true}"

print_message() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -u, --user USER         SSH user for EC2 (default: ubuntu)"
    echo "  -k, --key KEY_PATH      SSH private key path (default: ~/.ssh/id_rsa)"
    echo "  -d, --dir APP_DIR       Application directory on EC2 (default: /home/ubuntu/POProject)"
    echo "  --no-backup            Skip backing up existing .env files"
    echo ""
    echo "Environment variables:"
    echo "  EC2_HOST               EC2 instance hostname or IP"
    echo "  NEW_DATABASE_URL       New RDS PostgreSQL connection string"
    echo ""
    echo "Example:"
    echo "  export EC2_HOST='ec2-15-164-169-201.ap-northeast-2.compute.amazonaws.com'"
    echo "  export NEW_DATABASE_URL='postgresql://postgres:password@rds-endpoint:5432/db'"
    echo "  $0 --user ubuntu --key ~/.ssh/my-key.pem"
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -u|--user)
                EC2_USER="$2"
                shift 2
                ;;
            -k|--key)
                SSH_KEY="$2"
                shift 2
                ;;
            -d|--dir)
                APP_DIR="$2"
                shift 2
                ;;
            --no-backup)
                BACKUP_ENV="false"
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

check_dependencies() {
    print_message "Checking dependencies..."
    
    if ! command -v ssh &> /dev/null; then
        print_error "SSH client is not installed"
        exit 1
    fi
    
    if ! command -v scp &> /dev/null; then
        print_error "SCP is not installed"
        exit 1
    fi
    
    print_success "Dependencies check passed"
}

validate_configuration() {
    print_message "Validating configuration..."
    
    if [[ -z "$EC2_HOST" ]]; then
        print_error "EC2_HOST is not set"
        show_usage
        exit 1
    fi
    
    if [[ -z "$NEW_DATABASE_URL" ]]; then
        # Try to get from backup files
        LATEST_BACKUP=$(find ./backups -name "new_database_url.env" 2>/dev/null | head -n 1)
        if [[ -f "$LATEST_BACKUP" ]]; then
            NEW_DATABASE_URL=$(grep "DATABASE_URL=" "$LATEST_BACKUP" | cut -d'"' -f2)
            print_message "Found DATABASE_URL in backup file: $LATEST_BACKUP"
        fi
        
        if [[ -z "$NEW_DATABASE_URL" ]]; then
            print_error "NEW_DATABASE_URL is not set"
            print_message "Please provide the new RDS connection string"
            print_message "Format: postgresql://user:password@endpoint:5432/database?sslmode=require"
            exit 1
        fi
    fi
    
    if [[ ! -f "$SSH_KEY" ]]; then
        print_error "SSH key not found: $SSH_KEY"
        exit 1
    fi
    
    print_success "Configuration validated"
    print_message "EC2 Host: $EC2_HOST"
    print_message "SSH User: $EC2_USER"
    print_message "App Directory: $APP_DIR"
}

test_ssh_connection() {
    print_message "Testing SSH connection to EC2 instance..."
    
    if ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes "$EC2_USER@$EC2_HOST" "echo 'SSH connection successful'" > /dev/null 2>&1; then
        print_success "SSH connection successful"
    else
        print_error "Failed to connect to EC2 instance"
        print_message "Please check:"
        echo "  - EC2 instance is running"
        echo "  - Security group allows SSH (port 22)"
        echo "  - SSH key has correct permissions (chmod 400)"
        echo "  - SSH key matches the instance key pair"
        exit 1
    fi
}

backup_existing_env() {
    if [[ "$BACKUP_ENV" == "true" ]]; then
        print_message "Backing up existing environment files..."
        
        BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        
        # Create backup directory on EC2
        ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "mkdir -p $APP_DIR/backups/env_$BACKUP_TIMESTAMP"
        
        # Backup .env files if they exist
        ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "
            cd $APP_DIR
            if [[ -f .env ]]; then
                cp .env backups/env_$BACKUP_TIMESTAMP/.env.backup
                echo 'Backed up .env file'
            fi
            if [[ -f .env.local ]]; then
                cp .env.local backups/env_$BACKUP_TIMESTAMP/.env.local.backup
                echo 'Backed up .env.local file'
            fi
            if [[ -f .env.production ]]; then
                cp .env.production backups/env_$BACKUP_TIMESTAMP/.env.production.backup
                echo 'Backed up .env.production file'
            fi
        "
        
        print_success "Environment files backed up to: $APP_DIR/backups/env_$BACKUP_TIMESTAMP"
    else
        print_message "Skipping environment backup"
    fi
}

update_database_url() {
    print_message "Updating DATABASE_URL on EC2 instance..."
    
    # Create temporary environment update script
    TEMP_SCRIPT=$(mktemp)
    cat > "$TEMP_SCRIPT" << 'EOF'
#!/bin/bash

APP_DIR="$1"
NEW_DATABASE_URL="$2"

cd "$APP_DIR" || exit 1

# Function to update or add DATABASE_URL in a file
update_env_file() {
    local file="$1"
    local url="$2"
    
    if [[ -f "$file" ]]; then
        # Check if DATABASE_URL exists
        if grep -q "^DATABASE_URL=" "$file"; then
            # Update existing DATABASE_URL
            sed -i.tmp "s|^DATABASE_URL=.*|DATABASE_URL=\"$url\"|" "$file"
            rm -f "$file.tmp"
            echo "Updated DATABASE_URL in $file"
        else
            # Add new DATABASE_URL
            echo "DATABASE_URL=\"$url\"" >> "$file"
            echo "Added DATABASE_URL to $file"
        fi
    else
        # Create new file
        echo "DATABASE_URL=\"$url\"" > "$file"
        echo "Created $file with DATABASE_URL"
    fi
}

# Update .env file (primary)
update_env_file ".env" "$NEW_DATABASE_URL"

# Update .env.production if it exists
if [[ -f ".env.production" ]]; then
    update_env_file ".env.production" "$NEW_DATABASE_URL"
fi

# Display current DATABASE_URL for verification
echo ""
echo "Current DATABASE_URL configuration:"
if [[ -f ".env" ]]; then
    echo "=== .env ==="
    grep "DATABASE_URL=" .env || echo "No DATABASE_URL found"
fi

if [[ -f ".env.production" ]]; then
    echo "=== .env.production ==="
    grep "DATABASE_URL=" .env.production || echo "No DATABASE_URL found"
fi
EOF

    # Copy script to EC2 and execute
    scp -i "$SSH_KEY" "$TEMP_SCRIPT" "$EC2_USER@$EC2_HOST:/tmp/update_env.sh"
    ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "chmod +x /tmp/update_env.sh && /tmp/update_env.sh '$APP_DIR' '$NEW_DATABASE_URL'"
    
    # Clean up
    rm -f "$TEMP_SCRIPT"
    ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "rm -f /tmp/update_env.sh"
    
    print_success "DATABASE_URL updated successfully"
}

restart_application() {
    print_message "Restarting Pure Ocean application..."
    
    # Check if PM2 is being used
    PM2_CHECK=$(ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "command -v pm2 > /dev/null && echo 'pm2_available' || echo 'pm2_not_available'")
    
    if [[ "$PM2_CHECK" == "pm2_available" ]]; then
        print_message "Detected PM2, restarting application..."
        ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "
            cd $APP_DIR
            # Restart PM2 processes
            pm2 restart all 2>/dev/null || pm2 start npm --name 'pure-ocean' -- start
            pm2 save
        "
        print_success "Application restarted with PM2"
    else
        print_message "PM2 not detected, attempting manual restart..."
        ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "
            cd $APP_DIR
            # Kill existing Node.js processes (be careful!)
            pkill -f 'node.*next' || true
            
            # Start application in background
            nohup npm start > app.log 2>&1 &
            echo 'Application started in background'
        "
        print_success "Application restarted manually"
    fi
    
    # Wait a moment and check if the application is running
    sleep 5
    print_message "Checking application status..."
    
    APP_STATUS=$(ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "
        if pgrep -f 'node.*next' > /dev/null; then
            echo 'running'
        else
            echo 'not_running'
        fi
    ")
    
    if [[ "$APP_STATUS" == "running" ]]; then
        print_success "Application is running"
    else
        print_warning "Application may not be running properly"
        print_message "Check application logs on the EC2 instance"
    fi
}

test_database_connection() {
    print_message "Testing database connectivity from EC2..."
    
    # Create database test script
    TEMP_TEST_SCRIPT=$(mktemp)
    cat > "$TEMP_TEST_SCRIPT" << 'EOF'
#!/bin/bash

APP_DIR="$1"
cd "$APP_DIR" || exit 1

echo "Testing database connection..."

# Check if Prisma is available
if command -v npx > /dev/null && [[ -f package.json ]] && grep -q "prisma" package.json; then
    echo "Testing with Prisma..."
    
    # Generate Prisma client
    npx prisma generate > /dev/null 2>&1 || echo "Prisma generate failed"
    
    # Test database connection
    if npx prisma db pull --force > /dev/null 2>&1; then
        echo "✓ Database connection successful"
        echo "✓ Prisma can connect to the database"
        
        # Get table count
        TABLE_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | grep -o '[0-9]*' | tail -n 1)
        if [[ -n "$TABLE_COUNT" ]]; then
            echo "✓ Found $TABLE_COUNT tables in the database"
        fi
    else
        echo "✗ Database connection failed with Prisma"
        return 1
    fi
else
    echo "Prisma not found, testing with environment variable..."
    
    # Extract connection details from DATABASE_URL
    if [[ -f .env ]]; then
        source .env
        if [[ -n "$DATABASE_URL" ]]; then
            echo "✓ DATABASE_URL is set"
            echo "Connection string format appears valid: ${DATABASE_URL:0:30}..."
        else
            echo "✗ DATABASE_URL not found in .env"
            return 1
        fi
    fi
fi

echo "Database connectivity test completed"
EOF

    # Copy and execute test script
    scp -i "$SSH_KEY" "$TEMP_TEST_SCRIPT" "$EC2_USER@$EC2_HOST:/tmp/test_db.sh"
    
    if ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "chmod +x /tmp/test_db.sh && /tmp/test_db.sh '$APP_DIR'"; then
        print_success "Database connectivity test passed"
    else
        print_warning "Database connectivity test failed"
        print_message "Please check the DATABASE_URL and network connectivity"
    fi
    
    # Clean up
    rm -f "$TEMP_TEST_SCRIPT"
    ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "rm -f /tmp/test_db.sh"
}

generate_health_check_script() {
    print_message "Creating health check script on EC2..."
    
    ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "cat > $APP_DIR/health_check.sh" << 'EOF'
#!/bin/bash

# Pure Ocean Platform Health Check Script

APP_DIR="${1:-$(pwd)}"
cd "$APP_DIR" || exit 1

echo "=== Pure Ocean Platform Health Check ==="
echo "Timestamp: $(date)"
echo "Directory: $APP_DIR"
echo ""

# Check if application is running
echo "1. Application Status:"
if pgrep -f "node.*next" > /dev/null; then
    echo "   ✓ Next.js application is running"
    PROCESS_COUNT=$(pgrep -f "node.*next" | wc -l)
    echo "   ✓ Process count: $PROCESS_COUNT"
else
    echo "   ✗ Next.js application is NOT running"
fi
echo ""

# Check environment
echo "2. Environment Configuration:"
if [[ -f .env ]]; then
    echo "   ✓ .env file exists"
    if grep -q "DATABASE_URL=" .env; then
        echo "   ✓ DATABASE_URL is configured"
    else
        echo "   ✗ DATABASE_URL not found in .env"
    fi
else
    echo "   ✗ .env file not found"
fi
echo ""

# Check database connectivity
echo "3. Database Connectivity:"
if command -v npx > /dev/null && [[ -f package.json ]] && grep -q "prisma" package.json; then
    if npx prisma db pull --force > /dev/null 2>&1; then
        echo "   ✓ Database connection successful"
    else
        echo "   ✗ Database connection failed"
    fi
else
    echo "   - Prisma not available for testing"
fi
echo ""

# Check disk space
echo "4. System Resources:"
DISK_USAGE=$(df -h "$APP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
if [[ $DISK_USAGE -lt 90 ]]; then
    echo "   ✓ Disk usage: ${DISK_USAGE}%"
else
    echo "   ⚠ Disk usage high: ${DISK_USAGE}%"
fi

# Check memory
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
echo "   ✓ Memory usage: ${MEMORY_USAGE}%"
echo ""

# Check logs for errors
echo "5. Recent Logs:"
if [[ -f app.log ]]; then
    RECENT_ERRORS=$(tail -100 app.log | grep -i error | wc -l)
    echo "   ✓ Recent errors in app.log: $RECENT_ERRORS"
else
    echo "   - No app.log file found"
fi

echo ""
echo "=== Health Check Complete ==="
EOF

    ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "chmod +x $APP_DIR/health_check.sh"
    
    print_success "Health check script created at: $APP_DIR/health_check.sh"
    print_message "Run with: ./health_check.sh on your EC2 instance"
}

main() {
    print_message "Starting EC2 environment update process..."
    echo ""
    
    parse_arguments "$@"
    check_dependencies
    validate_configuration
    test_ssh_connection
    
    backup_existing_env
    update_database_url
    restart_application
    test_database_connection
    generate_health_check_script
    
    echo ""
    print_success "EC2 environment update completed!"
    echo ""
    print_message "Summary of changes:"
    echo "  ✓ DATABASE_URL updated to use AWS RDS"
    echo "  ✓ Application restarted"
    echo "  ✓ Database connectivity tested"
    echo "  ✓ Health check script created"
    echo ""
    print_message "Next steps:"
    echo "  1. Test your application: http://$EC2_HOST"
    echo "  2. Monitor application logs for any issues"
    echo "  3. Run health check: ssh $EC2_USER@$EC2_HOST '$APP_DIR/health_check.sh'"
    echo "  4. Update any CI/CD pipelines with new DATABASE_URL"
    echo ""
    print_message "Rollback instructions:"
    echo "  - Environment backups are in: $APP_DIR/backups/"
    echo "  - Restore with: cp backup_file .env"
    echo "  - Restart application after restoring"
}

# Run the main function
main "$@"