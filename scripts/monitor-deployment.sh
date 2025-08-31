#!/bin/bash

# Pure Ocean Platform - Production Monitoring Script
# Comprehensive health monitoring and management

set -e

# Configuration
SERVER_HOST="15.164.202.209"
SERVER_USER="ubuntu"
SSH_KEY="POProject.pem"
DOMAIN="xn--ox6bo4n.com"
API_HEALTH_URL="https://${DOMAIN}/api/health"
PM2_APP_NAME="pure-ocean-app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
LOG_DIR="/tmp/pure-ocean-monitoring"
mkdir -p $LOG_DIR
LOG_FILE="$LOG_DIR/monitor-$(date +%Y%m%d).log"

log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a $LOG_FILE
}

# Help function
show_help() {
    echo "Pure Ocean Platform Monitoring Script"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  status       - Show comprehensive status"
    echo "  health       - Check health endpoints"
    echo "  logs         - View application logs"
    echo "  restart      - Restart application"
    echo "  monitor      - Continuous monitoring (Ctrl+C to stop)"
    echo "  resources    - Show resource usage"
    echo "  backup       - Create emergency backup"
    echo "  help         - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 status"
    echo "  $0 health"
    echo "  $0 monitor"
    echo ""
}

# Check if server is accessible
check_server_access() {
    log "${BLUE}🔍 Checking server accessibility...${NC}"
    
    if ! ping -c 1 $SERVER_HOST >/dev/null 2>&1; then
        log "${RED}❌ Server $SERVER_HOST is not reachable via ping${NC}"
        return 1
    fi
    
    if ! ssh -i $SSH_KEY -o ConnectTimeout=10 $SERVER_USER@$SERVER_HOST "echo 'SSH connection test'" >/dev/null 2>&1; then
        log "${RED}❌ SSH connection to $SERVER_HOST failed${NC}"
        return 1
    fi
    
    log "${GREEN}✅ Server is accessible${NC}"
    return 0
}

# Get PM2 status
get_pm2_status() {
    log "${BLUE}🔍 Checking PM2 application status...${NC}"
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'EOF'
        echo "📊 PM2 Process Status:"
        pm2 status
        
        echo ""
        echo "💾 PM2 Memory Usage:"
        pm2 monit --no-colors | head -20
        
        echo ""
        echo "📈 PM2 Process Info:"
        pm2 info pure-ocean-app
EOF
}

# Check health endpoints
check_health() {
    log "${BLUE}🏥 Checking application health...${NC}"
    
    # Check main website
    local website_status
    if website_status=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" --max-time 30); then
        if [[ "$website_status" == "200" ]]; then
            log "${GREEN}✅ Website (https://$DOMAIN): HTTP $website_status${NC}"
        else
            log "${YELLOW}⚠️  Website (https://$DOMAIN): HTTP $website_status${NC}"
        fi
    else
        log "${RED}❌ Website (https://$DOMAIN): Connection failed${NC}"
    fi
    
    # Check health API
    local health_status
    if health_response=$(curl -s "$API_HEALTH_URL" --max-time 15); then
        health_status=$(echo "$health_response" | jq -r '.status' 2>/dev/null || echo "unknown")
        if [[ "$health_status" == "healthy" ]]; then
            log "${GREEN}✅ Health API: $health_status${NC}"
            
            # Show detailed health info
            echo "$health_response" | jq '.' 2>/dev/null | head -20
        else
            log "${YELLOW}⚠️  Health API: $health_status${NC}"
            echo "$health_response" | head -10
        fi
    else
        log "${RED}❌ Health API: Connection failed${NC}"
    fi
    
    # Check specific endpoints
    local endpoints=("/api/health" "/socket.io/socket.io.js")
    for endpoint in "${endpoints[@]}"; do
        local status
        if status=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN$endpoint" --max-time 10); then
            if [[ "$status" =~ ^[23] ]]; then
                log "${GREEN}✅ Endpoint $endpoint: HTTP $status${NC}"
            else
                log "${YELLOW}⚠️  Endpoint $endpoint: HTTP $status${NC}"
            fi
        else
            log "${RED}❌ Endpoint $endpoint: Connection failed${NC}"
        fi
    done
}

# Show logs
show_logs() {
    local lines=${1:-50}
    log "${BLUE}📝 Showing last $lines lines of application logs...${NC}"
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << EOF
        echo "=== PM2 Application Logs ==="
        pm2 logs $PM2_APP_NAME --lines $lines --nostream
        
        echo ""
        echo "=== System Logs (last 20 lines) ==="
        sudo tail -20 /var/log/syslog | grep -E "(pure-ocean|nginx|pm2)" || echo "No relevant system logs found"
        
        echo ""
        echo "=== Nginx Error Logs (last 10 lines) ==="
        sudo tail -10 /var/log/nginx/pure-ocean-error.log 2>/dev/null || echo "No nginx error logs found"
EOF
}

# Show resource usage
show_resources() {
    log "${BLUE}📊 Checking system resources...${NC}"
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'EOF'
        echo "=== System Overview ==="
        echo "Hostname: $(hostname)"
        echo "Uptime: $(uptime)"
        echo "Load Average: $(cat /proc/loadavg)"
        
        echo ""
        echo "=== Memory Usage ==="
        free -h
        
        echo ""
        echo "=== Disk Usage ==="
        df -h / /tmp /var
        
        echo ""
        echo "=== Network Connections ==="
        ss -tulnp | grep :3000 || echo "No connections on port 3000"
        ss -tulnp | grep :443 || echo "No connections on port 443"
        
        echo ""
        echo "=== Process Information ==="
        ps aux | grep -E "(node|nginx|pm2)" | head -10
        
        echo ""
        echo "=== PostgreSQL Status ==="
        sudo systemctl status postgresql --no-pager -l || echo "PostgreSQL status unavailable"
        
        echo ""
        echo "=== Nginx Status ==="
        sudo systemctl status nginx --no-pager -l || echo "Nginx status unavailable"
EOF
}

# Restart application
restart_app() {
    log "${YELLOW}🔄 Restarting application...${NC}"
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'EOF'
        cd /home/ubuntu/pure-ocean
        
        echo "Stopping PM2 processes..."
        pm2 delete pure-ocean-app || echo "No process to delete"
        
        echo "Checking port availability..."
        sudo lsof -ti:3000 | xargs sudo kill -9 2>/dev/null || echo "Port 3000 is free"
        
        echo "Waiting for cleanup..."
        sleep 5
        
        echo "Starting application..."
        pm2 start ecosystem.config.js
        pm2 save
        
        echo "Waiting for startup..."
        sleep 10
        
        echo "Application restart completed!"
        pm2 status
EOF
    
    log "${GREEN}✅ Application restarted${NC}"
}

# Continuous monitoring
continuous_monitor() {
    log "${BLUE}🔄 Starting continuous monitoring... (Press Ctrl+C to stop)${NC}"
    
    local count=0
    while true; do
        clear
        echo -e "${BLUE}=== Pure Ocean Platform Monitoring ===${NC}"
        echo "Monitoring cycle: $((++count)) | $(date)"
        echo "Press Ctrl+C to stop"
        echo ""
        
        # Quick health check
        check_health
        echo ""
        
        # Show PM2 status
        echo -e "${BLUE}📊 PM2 Status:${NC}"
        ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST "pm2 status" 2>/dev/null || echo "PM2 status unavailable"
        echo ""
        
        # Show resource usage summary
        echo -e "${BLUE}📈 Resource Summary:${NC}"
        ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'EOF'
            echo "Load: $(cat /proc/loadavg | cut -d' ' -f1-3)"
            echo "Memory: $(free -h | grep Mem | awk '{print $3 "/" $2 " (" int($3/$2*100) "%)"}')"
            echo "Disk: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 ")"}')"
EOF
        
        echo ""
        echo "Next check in 30 seconds..."
        
        # Wait 30 seconds or until Ctrl+C
        sleep 30
    done
}

# Create emergency backup
create_backup() {
    log "${BLUE}💾 Creating emergency backup...${NC}"
    
    local backup_name="emergency-backup-$(date +%Y%m%d-%H%M%S)"
    
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << EOF
        cd /home/ubuntu
        
        echo "Creating backup: $backup_name"
        
        # Create backup directory
        mkdir -p backups
        
        # Backup application files
        tar -czf "backups/${backup_name}-app.tar.gz" pure-ocean/ 2>/dev/null || echo "App backup completed with warnings"
        
        # Backup database
        if command -v pg_dump >/dev/null 2>&1; then
            sudo -u postgres pg_dump pure_ocean > "backups/${backup_name}-db.sql" 2>/dev/null || echo "Database backup failed"
        fi
        
        # Backup PM2 configuration
        pm2 save
        cp ~/.pm2/dump.pm2 "backups/${backup_name}-pm2.json" 2>/dev/null || echo "PM2 backup completed with warnings"
        
        echo "Backup created: $backup_name"
        ls -la backups/ | tail -5
EOF
    
    log "${GREEN}✅ Emergency backup completed${NC}"
}

# Main command handler
main() {
    case "${1:-help}" in
        status)
            log "${BLUE}🔍 Comprehensive status check...${NC}"
            check_server_access
            get_pm2_status
            show_resources
            check_health
            ;;
        health)
            check_health
            ;;
        logs)
            show_logs "${2:-50}"
            ;;
        restart)
            restart_app
            ;;
        monitor)
            continuous_monitor
            ;;
        resources)
            show_resources
            ;;
        backup)
            create_backup
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