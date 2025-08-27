#!/bin/bash

# Pure Ocean Platform - AWS RDS Data Import Script
# This script imports data from Railway backup files to AWS RDS PostgreSQL

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${1:-./backups}"
AWS_REGION="${AWS_REGION:-ap-northeast-2}"

# AWS RDS connection details (will be populated from Terraform outputs)
RDS_ENDPOINT="${RDS_ENDPOINT:-}"
RDS_PORT="${RDS_PORT:-5432}"
RDS_DATABASE="${RDS_DATABASE:-pure_ocean_production}"
RDS_USER="${RDS_USER:-postgres}"
RDS_PASSWORD="${RDS_PASSWORD:-}"

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
    echo "Usage: $0 [BACKUP_DIRECTORY]"
    echo ""
    echo "Environment variables required:"
    echo "  RDS_ENDPOINT    - AWS RDS endpoint"
    echo "  RDS_PASSWORD    - RDS master password"
    echo "  RDS_USER        - RDS username (default: postgres)"
    echo "  RDS_DATABASE    - RDS database name (default: pure_ocean_production)"
    echo "  AWS_REGION      - AWS region (default: ap-northeast-2)"
    echo ""
    echo "Example:"
    echo "  export RDS_ENDPOINT='your-rds-endpoint.rds.amazonaws.com'"
    echo "  export RDS_PASSWORD='your-secure-password'"
    echo "  $0 ./backups/20240127_143022"
}

check_dependencies() {
    print_message "Checking dependencies..."
    
    if ! command -v psql &> /dev/null; then
        print_error "psql is not installed. Please install PostgreSQL client tools."
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install AWS CLI."
        exit 1
    fi
    
    print_success "Dependencies check passed"
}

get_rds_credentials() {
    print_message "Retrieving RDS credentials..."
    
    if [[ -z "$RDS_ENDPOINT" || -z "$RDS_PASSWORD" ]]; then
        print_message "Attempting to get credentials from Terraform outputs..."
        
        # Try to get from Terraform outputs
        if [[ -f "../terraform/terraform.tfstate" ]]; then
            RDS_ENDPOINT=$(terraform -chdir=../terraform output -raw rds_endpoint 2>/dev/null || echo "")
            if [[ -n "$RDS_ENDPOINT" ]]; then
                print_success "Retrieved RDS endpoint from Terraform: $RDS_ENDPOINT"
            fi
        fi
        
        # Try to get password from AWS Secrets Manager
        if [[ -z "$RDS_PASSWORD" ]]; then
            print_message "Attempting to retrieve password from AWS Secrets Manager..."
            SECRET_ARN=$(terraform -chdir=../terraform output -raw database_password_secret_arn 2>/dev/null || echo "")
            
            if [[ -n "$SECRET_ARN" ]]; then
                SECRET_VALUE=$(aws secretsmanager get-secret-value \
                    --secret-id "$SECRET_ARN" \
                    --region "$AWS_REGION" \
                    --query 'SecretString' \
                    --output text 2>/dev/null || echo "")
                
                if [[ -n "$SECRET_VALUE" ]]; then
                    RDS_PASSWORD=$(echo "$SECRET_VALUE" | grep -o '"password":"[^"]*"' | cut -d'"' -f4)
                    if [[ -n "$RDS_PASSWORD" ]]; then
                        print_success "Retrieved password from AWS Secrets Manager"
                    fi
                fi
            fi
        fi
    fi
    
    # Final validation
    if [[ -z "$RDS_ENDPOINT" || -z "$RDS_PASSWORD" ]]; then
        print_error "RDS credentials not found"
        show_usage
        exit 1
    fi
    
    print_success "RDS credentials validated"
}

validate_backup_directory() {
    print_message "Validating backup directory..."
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        print_error "Backup directory not found: $BACKUP_DIR"
        print_message "Please run export-railway-data.sh first to create backup files"
        exit 1
    fi
    
    # Find the most recent backup if no specific directory provided
    if [[ "$BACKUP_DIR" == "./backups" ]]; then
        LATEST_BACKUP=$(find ./backups -maxdepth 1 -type d -name "20*" | sort | tail -n 1)
        if [[ -n "$LATEST_BACKUP" ]]; then
            BACKUP_DIR="$LATEST_BACKUP"
            print_message "Using latest backup: $BACKUP_DIR"
        fi
    fi
    
    # Check for required files
    SCHEMA_FILE="$BACKUP_DIR/schema.sql"
    DATA_FILE="$BACKUP_DIR/data.sql"
    FULL_BACKUP_FILE="$BACKUP_DIR/full_backup.sql"
    
    if [[ ! -f "$SCHEMA_FILE" ]]; then
        print_error "Schema file not found: $SCHEMA_FILE"
        exit 1
    fi
    
    if [[ ! -f "$DATA_FILE" ]]; then
        print_error "Data file not found: $DATA_FILE"
        exit 1
    fi
    
    print_success "Backup files validated"
}

test_rds_connection() {
    print_message "Testing connection to AWS RDS..."
    
    export PGPASSWORD="$RDS_PASSWORD"
    
    if psql -h "$RDS_ENDPOINT" -p "$RDS_PORT" -U "$RDS_USER" -d "$RDS_DATABASE" -c "SELECT version();" > /dev/null 2>&1; then
        print_success "Connection to AWS RDS successful"
    else
        print_error "Failed to connect to AWS RDS"
        print_message "Please check:"
        echo "  - RDS endpoint: $RDS_ENDPOINT"
        echo "  - Security group allows access from this IP"
        echo "  - Database credentials are correct"
        echo "  - Database is publicly accessible (if connecting from outside VPC)"
        exit 1
    fi
}

backup_existing_data() {
    print_message "Creating backup of existing RDS data (if any)..."
    
    export PGPASSWORD="$RDS_PASSWORD"
    
    EXISTING_BACKUP="$BACKUP_DIR/rds_existing_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    pg_dump -h "$RDS_ENDPOINT" -p "$RDS_PORT" -U "$RDS_USER" -d "$RDS_DATABASE" \
        --no-owner \
        --no-privileges \
        --verbose \
        > "$EXISTING_BACKUP" 2>/dev/null || true
    
    if [[ -s "$EXISTING_BACKUP" ]]; then
        print_success "Existing data backed up to: $EXISTING_BACKUP"
    else
        print_message "No existing data found to backup"
        rm -f "$EXISTING_BACKUP"
    fi
}

import_schema() {
    print_message "Importing database schema..."
    
    export PGPASSWORD="$RDS_PASSWORD"
    
    # Import schema with error handling
    if psql -h "$RDS_ENDPOINT" -p "$RDS_PORT" -U "$RDS_USER" -d "$RDS_DATABASE" \
        -v ON_ERROR_STOP=1 \
        -f "$SCHEMA_FILE" > "$BACKUP_DIR/schema_import.log" 2>&1; then
        print_success "Schema import completed successfully"
    else
        print_error "Schema import failed"
        print_message "Check log file: $BACKUP_DIR/schema_import.log"
        tail -n 20 "$BACKUP_DIR/schema_import.log"
        exit 1
    fi
}

import_data() {
    print_message "Importing database data..."
    print_warning "This may take several minutes depending on data size..."
    
    export PGPASSWORD="$RDS_PASSWORD"
    
    # Import data with error handling
    if psql -h "$RDS_ENDPOINT" -p "$RDS_PORT" -U "$RDS_USER" -d "$RDS_DATABASE" \
        -v ON_ERROR_STOP=1 \
        -f "$DATA_FILE" > "$BACKUP_DIR/data_import.log" 2>&1; then
        print_success "Data import completed successfully"
    else
        print_error "Data import failed"
        print_message "Check log file: $BACKUP_DIR/data_import.log"
        tail -n 20 "$BACKUP_DIR/data_import.log"
        
        print_message "Attempting to continue with partial import..."
        return 1
    fi
}

verify_migration() {
    print_message "Verifying data migration..."
    
    export PGPASSWORD="$RDS_PASSWORD"
    
    VERIFY_SCRIPT="$BACKUP_DIR/verify_migration.sql"
    VERIFY_RESULTS="$BACKUP_DIR/verification_results.txt"
    
    if [[ -f "$VERIFY_SCRIPT" ]]; then
        psql -h "$RDS_ENDPOINT" -p "$RDS_PORT" -U "$RDS_USER" -d "$RDS_DATABASE" \
            -f "$VERIFY_SCRIPT" > "$VERIFY_RESULTS" 2>&1
        
        print_success "Verification results saved to: $VERIFY_RESULTS"
        print_message "Please review the results and compare with Railway data"
        
        # Show a summary
        echo ""
        print_message "Migration Summary:"
        echo "===================="
        grep -E "(total_|=== |ERROR)" "$VERIFY_RESULTS" | head -20 || true
        echo "===================="
        echo ""
    else
        print_warning "Verification script not found, skipping verification"
    fi
}

update_sequences() {
    print_message "Updating PostgreSQL sequences..."
    
    export PGPASSWORD="$RDS_PASSWORD"
    
    # Generate sequence update commands
    SEQUENCE_UPDATE_FILE="$BACKUP_DIR/update_sequences.sql"
    
    psql -h "$RDS_ENDPOINT" -p "$RDS_PORT" -U "$RDS_USER" -d "$RDS_DATABASE" -t -c "
        SELECT 'SELECT setval(''' || sequence_name || ''', (SELECT MAX(' || column_name || ') FROM \"' || table_name || '\"));'
        FROM information_schema.columns 
        WHERE column_default LIKE 'nextval%' 
        AND table_schema = 'public';
    " > "$SEQUENCE_UPDATE_FILE"
    
    # Execute sequence updates
    if [[ -s "$SEQUENCE_UPDATE_FILE" ]]; then
        psql -h "$RDS_ENDPOINT" -p "$RDS_PORT" -U "$RDS_USER" -d "$RDS_DATABASE" \
            -f "$SEQUENCE_UPDATE_FILE" > /dev/null 2>&1
        print_success "PostgreSQL sequences updated"
    else
        print_message "No sequences to update"
    fi
}

generate_connection_string() {
    print_message "Generating new DATABASE_URL..."
    
    CONNECTION_STRING="postgresql://$RDS_USER:$RDS_PASSWORD@$RDS_ENDPOINT:$RDS_PORT/$RDS_DATABASE?sslmode=require"
    
    ENV_FILE="$BACKUP_DIR/new_database_url.env"
    cat > "$ENV_FILE" << EOF
# New DATABASE_URL for AWS RDS
# Replace this in your EC2 environment variables
DATABASE_URL="$CONNECTION_STRING"
EOF

    print_success "New DATABASE_URL saved to: $ENV_FILE"
    print_warning "Remember to update this on your EC2 instance!"
}

cleanup() {
    # Clean up environment variables
    unset PGPASSWORD
}

main() {
    print_message "Starting AWS RDS data import process..."
    echo ""
    
    # Set up cleanup trap
    trap cleanup EXIT
    
    check_dependencies
    get_rds_credentials
    validate_backup_directory
    test_rds_connection
    
    backup_existing_data
    
    print_message "Starting migration process..."
    import_schema
    
    if import_data; then
        update_sequences
        verify_migration
        generate_connection_string
        
        echo ""
        print_success "Data migration completed successfully!"
        print_message "Migration files location: $BACKUP_DIR"
        echo ""
        print_message "Next steps:"
        echo "  1. Review verification results in $BACKUP_DIR/verification_results.txt"
        echo "  2. Update DATABASE_URL on your EC2 instance"
        echo "  3. Restart your Next.js application"
        echo "  4. Test application functionality"
        echo "  5. Update Prisma if needed: npx prisma generate"
        echo ""
        print_warning "Backup files contain production data - handle securely!"
    else
        print_error "Data migration completed with errors"
        print_message "Check log files in $BACKUP_DIR for details"
        print_message "You may need to manually resolve data conflicts"
        exit 1
    fi
}

# Show usage if help requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_usage
    exit 0
fi

# Run the main function
main "$@"