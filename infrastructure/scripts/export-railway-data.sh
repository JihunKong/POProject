#!/bin/bash

# Pure Ocean Platform - Railway Data Export Script
# This script exports data from Railway PostgreSQL to prepare for AWS RDS migration

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
SCHEMA_FILE="$BACKUP_DIR/schema.sql"
DATA_FILE="$BACKUP_DIR/data.sql"
FULL_BACKUP_FILE="$BACKUP_DIR/full_backup.sql"

# Railway database connection (update with your actual Railway credentials)
# You can get these from your Railway project's PostgreSQL service
RAILWAY_HOST="${RAILWAY_HOST:-}"
RAILWAY_PORT="${RAILWAY_PORT:-5432}"
RAILWAY_DATABASE="${RAILWAY_DATABASE:-railway}"
RAILWAY_USER="${RAILWAY_USER:-postgres}"
RAILWAY_PASSWORD="${RAILWAY_PASSWORD:-}"

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

check_dependencies() {
    print_message "Checking dependencies..."
    
    if ! command -v pg_dump &> /dev/null; then
        print_error "pg_dump is not installed. Please install PostgreSQL client tools."
        exit 1
    fi
    
    if ! command -v psql &> /dev/null; then
        print_error "psql is not installed. Please install PostgreSQL client tools."
        exit 1
    fi
    
    print_success "Dependencies check passed"
}

setup_environment() {
    print_message "Setting up environment..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Check if Railway credentials are provided
    if [[ -z "$RAILWAY_HOST" || -z "$RAILWAY_PASSWORD" ]]; then
        print_error "Railway database credentials not provided"
        print_message "Please set the following environment variables:"
        echo "  export RAILWAY_HOST='your-railway-host'"
        echo "  export RAILWAY_DATABASE='your-database-name'"
        echo "  export RAILWAY_USER='your-username'"
        echo "  export RAILWAY_PASSWORD='your-password'"
        echo ""
        print_message "You can find these in your Railway project dashboard:"
        echo "  1. Go to your Railway project"
        echo "  2. Click on your PostgreSQL service"
        echo "  3. Go to the 'Connect' tab"
        echo "  4. Copy the connection details"
        exit 1
    fi
    
    print_success "Environment setup complete"
    print_message "Backup directory: $BACKUP_DIR"
}

test_connection() {
    print_message "Testing connection to Railway database..."
    
    export PGPASSWORD="$RAILWAY_PASSWORD"
    
    if psql -h "$RAILWAY_HOST" -p "$RAILWAY_PORT" -U "$RAILWAY_USER" -d "$RAILWAY_DATABASE" -c "SELECT version();" > /dev/null 2>&1; then
        print_success "Connection to Railway database successful"
    else
        print_error "Failed to connect to Railway database"
        print_message "Please check your credentials and network connectivity"
        exit 1
    fi
}

export_schema() {
    print_message "Exporting database schema..."
    
    export PGPASSWORD="$RAILWAY_PASSWORD"
    
    # Export schema only (no data)
    pg_dump -h "$RAILWAY_HOST" -p "$RAILWAY_PORT" -U "$RAILWAY_USER" -d "$RAILWAY_DATABASE" \
        --schema-only \
        --no-owner \
        --no-privileges \
        --verbose \
        > "$SCHEMA_FILE"
    
    if [[ $? -eq 0 ]]; then
        print_success "Schema export completed: $SCHEMA_FILE"
    else
        print_error "Schema export failed"
        exit 1
    fi
}

export_data() {
    print_message "Exporting database data..."
    
    export PGPASSWORD="$RAILWAY_PASSWORD"
    
    # Export data only (no schema)
    pg_dump -h "$RAILWAY_HOST" -p "$RAILWAY_PORT" -U "$RAILWAY_USER" -d "$RAILWAY_DATABASE" \
        --data-only \
        --no-owner \
        --no-privileges \
        --disable-triggers \
        --verbose \
        > "$DATA_FILE"
    
    if [[ $? -eq 0 ]]; then
        print_success "Data export completed: $DATA_FILE"
    else
        print_error "Data export failed"
        exit 1
    fi
}

export_full_backup() {
    print_message "Creating full database backup..."
    
    export PGPASSWORD="$RAILWAY_PASSWORD"
    
    # Export complete database (schema + data)
    pg_dump -h "$RAILWAY_HOST" -p "$RAILWAY_PORT" -U "$RAILWAY_USER" -d "$RAILWAY_DATABASE" \
        --no-owner \
        --no-privileges \
        --verbose \
        > "$FULL_BACKUP_FILE"
    
    if [[ $? -eq 0 ]]; then
        print_success "Full backup completed: $FULL_BACKUP_FILE"
    else
        print_error "Full backup failed"
        exit 1
    fi
}

generate_migration_info() {
    print_message "Generating migration information..."
    
    INFO_FILE="$BACKUP_DIR/migration_info.txt"
    
    cat > "$INFO_FILE" << EOF
Pure Ocean Platform - Railway to AWS RDS Migration
Export Date: $(date)
Railway Host: $RAILWAY_HOST
Railway Database: $RAILWAY_DATABASE

Files Created:
- schema.sql: Database schema only
- data.sql: Database data only  
- full_backup.sql: Complete database backup
- migration_info.txt: This information file

Next Steps:
1. Set up AWS RDS instance using Terraform
2. Run import-to-rds.sh script to import data
3. Update environment variables on EC2 instance
4. Test application connectivity

Important Notes:
- Backup files contain sensitive data - handle securely
- Test the migration in a staging environment first
- Verify data integrity after migration
- Update connection pooling settings if needed
EOF

    print_success "Migration information saved: $INFO_FILE"
}

generate_verification_script() {
    print_message "Generating data verification script..."
    
    VERIFY_SCRIPT="$BACKUP_DIR/verify_migration.sql"
    
    cat > "$VERIFY_SCRIPT" << 'EOF'
-- Pure Ocean Platform - Data Migration Verification Script
-- Run this script on both Railway and AWS RDS to compare data

\echo 'Starting data verification...'
\echo ''

-- Count all tables and rows
\echo '=== Table Row Counts ==='
SELECT 
    schemaname,
    tablename,
    n_tup_ins as total_rows
FROM pg_stat_user_tables 
ORDER BY schemaname, tablename;

\echo ''
\echo '=== User Account Summary ==='
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'STUDENT' THEN 1 END) as students,
    COUNT(CASE WHEN role = 'TEACHER' THEN 1 END) as teachers,
    COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admins
FROM "User";

\echo ''
\echo '=== Team Summary ==='
SELECT 
    COUNT(*) as total_teams,
    AVG(CASE WHEN "maxMembers" > 0 THEN "maxMembers" END) as avg_max_members
FROM "Team";

\echo ''
\echo '=== Task Summary ==='
SELECT 
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN status = 'TODO' THEN 1 END) as todo_tasks
FROM "Task";

\echo ''
\echo '=== Conversation Summary ==='
SELECT 
    COUNT(DISTINCT id) as total_conversations,
    COUNT(DISTINCT "userId") as users_with_conversations,
    AVG(message_count.count) as avg_messages_per_conversation
FROM "Conversation" c
LEFT JOIN (
    SELECT "conversationId", COUNT(*) as count 
    FROM "Message" 
    GROUP BY "conversationId"
) message_count ON c.id = message_count."conversationId";

\echo ''
\echo 'Verification complete. Compare these results between Railway and AWS RDS.'
EOF

    print_success "Verification script saved: $VERIFY_SCRIPT"
}

cleanup() {
    # Clean up environment variables
    unset PGPASSWORD
}

main() {
    print_message "Starting Railway data export process..."
    echo ""
    
    # Set up cleanup trap
    trap cleanup EXIT
    
    check_dependencies
    setup_environment
    test_connection
    
    export_schema
    export_data  
    export_full_backup
    
    generate_migration_info
    generate_verification_script
    
    echo ""
    print_success "Railway data export completed successfully!"
    print_message "Backup location: $BACKUP_DIR"
    echo ""
    print_message "Next steps:"
    echo "  1. Review the exported files in $BACKUP_DIR"
    echo "  2. Deploy AWS RDS instance using Terraform"
    echo "  3. Run import-to-rds.sh to import data to AWS RDS"
    echo "  4. Verify data integrity using verify_migration.sql"
    echo ""
    print_warning "Keep these backup files secure - they contain production data!"
}

# Run the main function
main "$@"