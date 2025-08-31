#!/bin/bash

# Pure Ocean Platform - Backup and Rollback System
# Enterprise-grade backup and disaster recovery

set -e

# Configuration
SERVER_HOST="15.164.202.209"
SERVER_USER="ubuntu"
SSH_KEY="POProject.pem"
DOMAIN="xn--ox6bo4n.com"
PM2_APP_NAME="pure-ocean-app"

# Backup configuration
BACKUP_DIR="/home/ubuntu/pure-ocean-backups"
MAX_BACKUPS=10
BACKUP_PREFIX="pure-ocean"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
LOG_DIR="/tmp/pure-ocean-backup"
mkdir -p $LOG_DIR
LOG_FILE="$LOG_DIR/backup-$(date +%Y%m%d).log"

log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a $LOG_FILE
}

# Help function
show_help() {
    echo "Pure Ocean Platform Backup & Rollback System"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  backup [description]     - Create a full system backup"
    echo "  list                    - List available backups"
    echo "  rollback <backup-name>  - Rollback to a specific backup"
    echo "  cleanup                 - Remove old backups (keeps last $MAX_BACKUPS)"
    echo "  verify <backup-name>    - Verify backup integrity"
    echo "  restore-db <backup-name> - Restore database only"
    echo "  help                    - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 backup \"Before security update\""
    echo "  $0 list"
    echo "  $0 rollback pure-ocean-20250101-120000"
    echo "  $0 verify pure-ocean-20250101-120000"
    echo ""
    echo "Backup includes:"
    echo "  - Application files and configuration"
    echo "  - Database dump (PostgreSQL)"
    echo "  - PM2 configuration"
    echo "  - Nginx configuration"
    echo "  - Environment files"
    echo "  - Log files (recent)"
    echo ""
}

# Create comprehensive backup
create_backup() {
    local description="${1:-Manual backup}"
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_name="${BACKUP_PREFIX}-${timestamp}"
    
    log "${BLUE}💾 Creating comprehensive backup: $backup_name${NC}"
    log "${BLUE}Description: $description${NC}"
    
    # Create backup on remote server
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << EOF
        set -e
        
        echo "🏗️ Setting up backup environment..."
        mkdir -p $BACKUP_DIR
        cd $BACKUP_DIR
        
        # Create backup metadata
        cat > "${backup_name}-metadata.json" << METADATA
{
    "backup_name": "$backup_name",
    "timestamp": "$timestamp",
    "description": "$description",
    "created_at": "$(date -Iseconds)",
    "hostname": "$(hostname)",
    "node_version": "$(node --version 2>/dev/null || echo 'unknown')",
    "npm_version": "$(npm --version 2>/dev/null || echo 'unknown')",
    "pm2_version": "$(pm2 --version 2>/dev/null || echo 'unknown')",
    "system_info": {
        "uptime": "$(uptime)",
        "load": "$(cat /proc/loadavg)",
        "memory": "$(free -h | grep Mem | awk '{print \$3 \"/\" \$2}')",
        "disk": "$(df -h / | tail -1 | awk '{print \$3 \"/\" \$2 \" (\" \$5 \")'\")"
    }
}
METADATA
        
        echo "📁 Backing up application files..."
        if [ -d "/home/ubuntu/pure-ocean" ]; then
            tar -czf "${backup_name}-app.tar.gz" \
                -C /home/ubuntu \
                --exclude=pure-ocean/node_modules \
                --exclude=pure-ocean/.next/cache \
                --exclude=pure-ocean/deploy.tar.gz \
                pure-ocean/
            echo "✅ Application files backed up"
        else
            echo "⚠️  Application directory not found"
        fi
        
        echo "🗄️ Backing up database..."
        if command -v pg_dump >/dev/null 2>&1; then
            # Test database connection first
            if sudo -u postgres psql -d pure_ocean -c "SELECT 1;" >/dev/null 2>&1; then
                sudo -u postgres pg_dump \
                    --verbose \
                    --no-password \
                    --format=custom \
                    --compress=9 \
                    --file="${backup_name}-db.dump" \
                    pure_ocean
                
                # Also create SQL version for easier inspection
                sudo -u postgres pg_dump \
                    --no-password \
                    --file="${backup_name}-db.sql" \
                    pure_ocean
                
                echo "✅ Database backed up (binary and SQL formats)"
            else
                echo "❌ Database connection failed - skipping DB backup"
                echo "database_backup_failed" > "${backup_name}-db.error"
            fi
        else
            echo "⚠️  pg_dump not available - skipping DB backup"
            echo "pg_dump_not_available" > "${backup_name}-db.error"
        fi
        
        echo "⚙️  Backing up PM2 configuration..."
        if command -v pm2 >/dev/null 2>&1; then
            pm2 dump --silent 2>/dev/null || echo "PM2 dump failed"
            if [ -f ~/.pm2/dump.pm2 ]; then
                cp ~/.pm2/dump.pm2 "${backup_name}-pm2.json"
                echo "✅ PM2 configuration backed up"
            else
                echo "⚠️  PM2 dump file not found"
            fi
        else
            echo "⚠️  PM2 not available"
        fi
        
        echo "🌐 Backing up Nginx configuration..."
        if [ -f "/etc/nginx/sites-available/pure-ocean" ]; then
            sudo cp /etc/nginx/sites-available/pure-ocean "${backup_name}-nginx.conf"
            echo "✅ Nginx configuration backed up"
        else
            echo "⚠️  Nginx configuration not found"
        fi
        
        echo "📄 Backing up environment and configuration files..."
        if [ -f "/home/ubuntu/pure-ocean/.env" ]; then
            cp /home/ubuntu/pure-ocean/.env "${backup_name}-env"
            echo "✅ Environment file backed up"
        fi
        
        if [ -f "/home/ubuntu/pure-ocean/ecosystem.config.js" ]; then
            cp /home/ubuntu/pure-ocean/ecosystem.config.js "${backup_name}-ecosystem.js"
            echo "✅ PM2 ecosystem config backed up"
        fi
        
        echo "📝 Backing up recent logs..."
        mkdir -p "${backup_name}-logs"
        
        # PM2 logs
        if [ -d "/var/log/pure-ocean" ]; then
            cp -r /var/log/pure-ocean "${backup_name}-logs/" 2>/dev/null || echo "Some PM2 logs inaccessible"
        fi
        
        # Nginx logs (recent only)
        if [ -f "/var/log/nginx/pure-ocean-access.log" ]; then
            sudo tail -1000 /var/log/nginx/pure-ocean-access.log > "${backup_name}-logs/nginx-access.log" 2>/dev/null || true
            sudo tail -1000 /var/log/nginx/pure-ocean-error.log > "${backup_name}-logs/nginx-error.log" 2>/dev/null || true
        fi
        
        # System logs (filtered for our application)
        sudo journalctl -u nginx --since "1 day ago" > "${backup_name}-logs/nginx-journal.log" 2>/dev/null || true
        
        tar -czf "${backup_name}-logs.tar.gz" "${backup_name}-logs/" && rm -rf "${backup_name}-logs/"
        echo "✅ Logs backed up"
        
        echo "🔒 Creating backup verification checksums..."
        find . -name "${backup_name}*" -type f -exec sha256sum {} \; > "${backup_name}-checksums.sha256"
        
        echo "📊 Backup summary:"
        echo "Backup Name: $backup_name"
        echo "Files created:"
        ls -lah ${backup_name}*
        
        echo ""
        echo "💾 Backup completed: $backup_name"
        echo "📁 Location: $BACKUP_DIR"
        echo "📄 Total size: \$(du -sh ${backup_name}* | awk '{total+=\$1} END {print total "MB"}' 2>/dev/null || echo 'calculating...')"
EOF

    if [ $? -eq 0 ]; then
        log "${GREEN}✅ Backup created successfully: $backup_name${NC}"
        log "${BLUE}📋 To restore this backup, use: $0 rollback $backup_name${NC}"
    else
        log "${RED}❌ Backup creation failed${NC}"
        return 1
    fi
}

# List available backups
list_backups() {
    log "${BLUE}📋 Listing available backups...${NC}"
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'EOF'
        if [ ! -d "/home/ubuntu/pure-ocean-backups" ]; then
            echo "No backups directory found"
            exit 0
        fi
        
        cd /home/ubuntu/pure-ocean-backups
        
        echo "Available backups:"
        echo "=================="
        
        # Find all backup metadata files
        for metadata in *-metadata.json; do
            if [ -f "$metadata" ]; then
                backup_name=$(basename "$metadata" "-metadata.json")
                echo ""
                echo "🗂️  Backup: $backup_name"
                
                # Extract key information from metadata
                if command -v jq >/dev/null 2>&1; then
                    echo "   Created: $(jq -r '.created_at' "$metadata" 2>/dev/null || echo 'unknown')"
                    echo "   Description: $(jq -r '.description' "$metadata" 2>/dev/null || echo 'unknown')"
                    echo "   System: $(jq -r '.system_info.uptime' "$metadata" 2>/dev/null | cut -d' ' -f3-5 || echo 'unknown')"
                else
                    echo "   Created: $(grep -o '"created_at":[^,]*' "$metadata" | cut -d'"' -f4 2>/dev/null || echo 'unknown')"
                    echo "   Description: $(grep -o '"description":[^,]*' "$metadata" | cut -d'"' -f4 2>/dev/null || echo 'unknown')"
                fi
                
                # Show backup files
                echo "   Files:"
                ls -lah ${backup_name}* 2>/dev/null | awk '{print "     " $5 " " $9}' | grep -v metadata
                
                # Show total size
                total_size=$(du -sh ${backup_name}* 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo "0")
                echo "   Total size: ${total_size}MB (estimated)"
            fi
        done
        
        echo ""
        echo "📊 Backup storage summary:"
        echo "Total backups: $(ls *-metadata.json 2>/dev/null | wc -l)"
        echo "Storage used: $(du -sh . 2>/dev/null | awk '{print $1}' || echo 'unknown')"
        echo ""
EOF
}

# Rollback to a specific backup
rollback_backup() {
    local backup_name="$1"
    
    if [ -z "$backup_name" ]; then
        echo -e "${RED}❌ Please specify backup name${NC}"
        echo "Use '$0 list' to see available backups"
        exit 1
    fi
    
    log "${YELLOW}🔄 Starting rollback to backup: $backup_name${NC}"
    log "${RED}⚠️  This operation will replace current application and data${NC}"
    
    # Confirmation prompt
    echo -e "${YELLOW}Are you sure you want to rollback to '$backup_name'? This will:"
    echo "- Stop the current application"
    echo "- Replace all application files"
    echo "- Restore the database (if backup exists)"
    echo "- Restart services"
    echo ""
    read -p "Type 'YES' to confirm rollback: " confirm
    
    if [ "$confirm" != "YES" ]; then
        log "${BLUE}Rollback cancelled by user${NC}"
        exit 0
    fi
    
    # Create emergency backup before rollback
    log "${BLUE}📦 Creating emergency backup before rollback...${NC}"
    create_backup "Emergency backup before rollback to $backup_name"
    
    # Perform rollback
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << EOF
        set -e
        
        cd $BACKUP_DIR
        
        # Verify backup exists
        if [ ! -f "${backup_name}-metadata.json" ]; then
            echo "❌ Backup $backup_name not found"
            exit 1
        fi
        
        echo "🔍 Verifying backup integrity..."
        if [ -f "${backup_name}-checksums.sha256" ]; then
            if sha256sum -c "${backup_name}-checksums.sha256" --quiet; then
                echo "✅ Backup integrity verified"
            else
                echo "⚠️  Backup integrity check failed, continuing anyway..."
            fi
        fi
        
        echo "🛑 Stopping current application..."
        pm2 delete $PM2_APP_NAME 2>/dev/null || echo "No PM2 process to stop"
        sudo lsof -ti:3000 | xargs sudo kill -9 2>/dev/null || echo "Port 3000 is free"
        
        echo "📁 Restoring application files..."
        if [ -f "${backup_name}-app.tar.gz" ]; then
            # Backup current application as safety measure
            if [ -d "/home/ubuntu/pure-ocean" ]; then
                mv /home/ubuntu/pure-ocean /home/ubuntu/pure-ocean.rollback-backup-\$(date +%H%M%S)
            fi
            
            # Extract backup
            cd /home/ubuntu
            tar -xzf "$BACKUP_DIR/${backup_name}-app.tar.gz"
            echo "✅ Application files restored"
        else
            echo "⚠️  No application backup file found"
        fi
        
        echo "🗄️ Restoring database..."
        if [ -f "$BACKUP_DIR/${backup_name}-db.dump" ]; then
            # Drop and recreate database
            sudo -u postgres psql << DBEOF
                DROP DATABASE IF EXISTS pure_ocean;
                CREATE DATABASE pure_ocean;
                GRANT ALL PRIVILEGES ON DATABASE pure_ocean TO postgres;
DBEOF
            
            # Restore from backup
            sudo -u postgres pg_restore \
                --verbose \
                --no-owner \
                --no-privileges \
                --dbname=pure_ocean \
                "$BACKUP_DIR/${backup_name}-db.dump"
                
            echo "✅ Database restored from backup"
        else
            echo "⚠️  No database backup found - skipping database restore"
        fi
        
        echo "🌐 Restoring Nginx configuration..."
        if [ -f "$BACKUP_DIR/${backup_name}-nginx.conf" ]; then
            sudo cp "$BACKUP_DIR/${backup_name}-nginx.conf" /etc/nginx/sites-available/pure-ocean
            sudo nginx -t && sudo systemctl reload nginx
            echo "✅ Nginx configuration restored"
        fi
        
        echo "⚙️  Restoring PM2 configuration..."
        if [ -f "$BACKUP_DIR/${backup_name}-pm2.json" ]; then
            cp "$BACKUP_DIR/${backup_name}-pm2.json" ~/.pm2/dump.pm2
            echo "✅ PM2 configuration restored"
        fi
        
        echo "📄 Restoring environment files..."
        if [ -f "$BACKUP_DIR/${backup_name}-env" ]; then
            cp "$BACKUP_DIR/${backup_name}-env" /home/ubuntu/pure-ocean/.env
            echo "✅ Environment file restored"
        fi
        
        if [ -f "$BACKUP_DIR/${backup_name}-ecosystem.js" ]; then
            cp "$BACKUP_DIR/${backup_name}-ecosystem.js" /home/ubuntu/pure-ocean/ecosystem.config.js
            echo "✅ Ecosystem config restored"
        fi
        
        echo "🔄 Reinstalling dependencies..."
        cd /home/ubuntu/pure-ocean
        npm ci
        npx prisma generate
        
        echo "🚀 Starting restored application..."
        pm2 start ecosystem.config.js
        pm2 save
        
        # Wait for application to start
        echo "⏳ Waiting for application to initialize..."
        sleep 15
        
        echo "✅ Rollback completed!"
        echo "📊 Application status:"
        pm2 status
EOF

    if [ $? -eq 0 ]; then
        log "${GREEN}✅ Rollback completed successfully${NC}"
        log "${BLUE}🔍 Verifying application health...${NC}"
        
        # Wait a moment for services to fully start
        sleep 10
        
        # Basic health check
        if curl -s "https://$DOMAIN/api/health" >/dev/null; then
            log "${GREEN}✅ Application is responding to health checks${NC}"
        else
            log "${YELLOW}⚠️  Health check failed - application may still be starting${NC}"
        fi
    else
        log "${RED}❌ Rollback failed - check server logs${NC}"
        return 1
    fi
}

# Verify backup integrity
verify_backup() {
    local backup_name="$1"
    
    if [ -z "$backup_name" ]; then
        echo -e "${RED}❌ Please specify backup name to verify${NC}"
        exit 1
    fi
    
    log "${BLUE}🔍 Verifying backup integrity: $backup_name${NC}"
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << EOF
        cd $BACKUP_DIR
        
        if [ ! -f "${backup_name}-metadata.json" ]; then
            echo "❌ Backup $backup_name not found"
            exit 1
        fi
        
        echo "📋 Backup Information:"
        if command -v jq >/dev/null 2>&1; then
            jq '.' "${backup_name}-metadata.json"
        else
            cat "${backup_name}-metadata.json"
        fi
        
        echo ""
        echo "🔍 File Verification:"
        
        # Check if all expected files exist
        expected_files=("${backup_name}-metadata.json")
        
        if [ -f "${backup_name}-app.tar.gz" ]; then
            echo "✅ Application backup exists"
            expected_files+=("${backup_name}-app.tar.gz")
        else
            echo "⚠️  Application backup missing"
        fi
        
        if [ -f "${backup_name}-db.dump" ]; then
            echo "✅ Database backup exists"
            expected_files+=("${backup_name}-db.dump")
        else
            echo "⚠️  Database backup missing"
        fi
        
        if [ -f "${backup_name}-checksums.sha256" ]; then
            echo "🔒 Verifying checksums..."
            if sha256sum -c "${backup_name}-checksums.sha256"; then
                echo "✅ All checksums verified"
            else
                echo "❌ Checksum verification failed"
                exit 1
            fi
        else
            echo "⚠️  No checksums available for verification"
        fi
        
        echo ""
        echo "📊 Backup File Sizes:"
        ls -lah ${backup_name}* | awk '{print $5 " " $9}'
        
        echo ""
        echo "✅ Backup verification completed"
EOF
}

# Cleanup old backups
cleanup_backups() {
    log "${BLUE}🧹 Cleaning up old backups (keeping last $MAX_BACKUPS)...${NC}"
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << EOF
        cd $BACKUP_DIR 2>/dev/null || exit 0
        
        # Count current backups
        backup_count=\$(ls *-metadata.json 2>/dev/null | wc -l)
        
        if [ \$backup_count -le $MAX_BACKUPS ]; then
            echo "📊 Current backups: \$backup_count (within limit of $MAX_BACKUPS)"
            echo "No cleanup needed"
            exit 0
        fi
        
        echo "📊 Found \$backup_count backups, removing oldest..."
        
        # Get backup names sorted by creation time (oldest first)
        old_backups=\$(ls -t *-metadata.json 2>/dev/null | tail -n +\$((MAX_BACKUPS + 1)) | sed 's/-metadata.json//')
        
        for backup in \$old_backups; do
            echo "🗑️  Removing backup: \$backup"
            rm -f \${backup}*
        done
        
        remaining=\$(ls *-metadata.json 2>/dev/null | wc -l)
        echo "✅ Cleanup completed - \$remaining backups remaining"
EOF
    
    log "${GREEN}✅ Backup cleanup completed${NC}"
}

# Restore database only
restore_db_only() {
    local backup_name="$1"
    
    if [ -z "$backup_name" ]; then
        echo -e "${RED}❌ Please specify backup name${NC}"
        exit 1
    fi
    
    log "${YELLOW}🗄️ Restoring database only from backup: $backup_name${NC}"
    
    echo -e "${YELLOW}⚠️  This will replace the current database. Continue? (y/N): ${NC}"
    read -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "${BLUE}Database restore cancelled${NC}"
        exit 0
    fi
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << EOF
        cd $BACKUP_DIR
        
        if [ ! -f "${backup_name}-db.dump" ]; then
            echo "❌ Database backup not found: ${backup_name}-db.dump"
            exit 1
        fi
        
        echo "🗄️ Restoring database from backup..."
        
        # Create backup of current database first
        echo "📦 Creating current database backup..."
        sudo -u postgres pg_dump pure_ocean > "current-db-backup-\$(date +%H%M%S).sql"
        
        # Restore from backup
        sudo -u postgres pg_restore \
            --verbose \
            --clean \
            --no-owner \
            --no-privileges \
            --dbname=pure_ocean \
            "${backup_name}-db.dump"
        
        echo "✅ Database restored successfully"
EOF
    
    log "${GREEN}✅ Database restore completed${NC}"
}

# Main command handler
main() {
    case "${1:-help}" in
        backup)
            create_backup "$2"
            ;;
        list)
            list_backups
            ;;
        rollback)
            rollback_backup "$2"
            ;;
        verify)
            verify_backup "$2"
            ;;
        cleanup)
            cleanup_backups
            ;;
        restore-db)
            restore_db_only "$2"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Ensure SSH key exists
if [[ ! -f "$SSH_KEY" ]]; then
    echo -e "${RED}❌ SSH key file '$SSH_KEY' not found in current directory${NC}"
    echo "Please ensure the SSH key is available and has proper permissions (600)"
    exit 1
fi

# Set proper SSH key permissions
chmod 600 "$SSH_KEY" 2>/dev/null || true

# Run main function
main "$@"