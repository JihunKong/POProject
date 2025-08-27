#!/bin/bash

# Pure Ocean Platform - AWS RDS Monitoring Setup
# This script configures CloudWatch monitoring and alerting for RDS

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-ap-northeast-2}"
SNS_TOPIC_NAME="${SNS_TOPIC_NAME:-pure-ocean-rds-alerts}"
EMAIL_ENDPOINT="${EMAIL_ENDPOINT:-}"
DB_IDENTIFIER="${DB_IDENTIFIER:-pure-ocean-production-postgres}"

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
    echo "  -e, --email EMAIL       Email address for alerts"
    echo "  -d, --db-id IDENTIFIER  RDS database identifier"
    echo "  -r, --region REGION     AWS region (default: ap-northeast-2)"
    echo ""
    echo "Environment variables:"
    echo "  EMAIL_ENDPOINT          Email address for receiving alerts"
    echo "  DB_IDENTIFIER           RDS database identifier"
    echo "  AWS_REGION              AWS region"
    echo ""
    echo "Example:"
    echo "  $0 --email admin@wando.hs.kr --db-id pure-ocean-production-postgres"
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -e|--email)
                EMAIL_ENDPOINT="$2"
                shift 2
                ;;
            -d|--db-id)
                DB_IDENTIFIER="$2"
                shift 2
                ;;
            -r|--region)
                AWS_REGION="$2"
                shift 2
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
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity > /dev/null 2>&1; then
        print_error "AWS credentials not configured"
        exit 1
    fi
    
    print_success "Dependencies check passed"
}

validate_configuration() {
    print_message "Validating configuration..."
    
    if [[ -z "$EMAIL_ENDPOINT" ]]; then
        print_error "Email endpoint is required for alerts"
        show_usage
        exit 1
    fi
    
    # Validate email format
    if [[ ! "$EMAIL_ENDPOINT" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
        print_error "Invalid email format: $EMAIL_ENDPOINT"
        exit 1
    fi
    
    # Check if RDS instance exists
    if ! aws rds describe-db-instances --db-instance-identifier "$DB_IDENTIFIER" --region "$AWS_REGION" > /dev/null 2>&1; then
        print_error "RDS instance not found: $DB_IDENTIFIER"
        print_message "Please ensure the RDS instance is created first"
        exit 1
    fi
    
    print_success "Configuration validated"
    print_message "Region: $AWS_REGION"
    print_message "Email: $EMAIL_ENDPOINT"
    print_message "DB Identifier: $DB_IDENTIFIER"
}

create_sns_topic() {
    print_message "Creating SNS topic for alerts..."
    
    # Create SNS topic
    TOPIC_ARN=$(aws sns create-topic \
        --name "$SNS_TOPIC_NAME" \
        --region "$AWS_REGION" \
        --query 'TopicArn' \
        --output text)
    
    if [[ $? -eq 0 && -n "$TOPIC_ARN" ]]; then
        print_success "SNS topic created: $TOPIC_ARN"
        
        # Subscribe email endpoint
        SUBSCRIPTION_ARN=$(aws sns subscribe \
            --topic-arn "$TOPIC_ARN" \
            --protocol email \
            --notification-endpoint "$EMAIL_ENDPOINT" \
            --region "$AWS_REGION" \
            --query 'SubscriptionArn' \
            --output text)
        
        if [[ $? -eq 0 ]]; then
            print_success "Email subscription created"
            print_warning "Please check your email and confirm the subscription!"
        else
            print_error "Failed to create email subscription"
            exit 1
        fi
    else
        print_error "Failed to create SNS topic"
        exit 1
    fi
    
    echo "$TOPIC_ARN" > /tmp/sns_topic_arn.txt
}

create_cloudwatch_alarms() {
    print_message "Creating CloudWatch alarms..."
    
    TOPIC_ARN=$(cat /tmp/sns_topic_arn.txt)
    
    # CPU Utilization Alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "${DB_IDENTIFIER}-high-cpu" \
        --alarm-description "RDS instance high CPU utilization" \
        --metric-name CPUUtilization \
        --namespace AWS/RDS \
        --statistic Average \
        --period 300 \
        --threshold 80 \
        --comparison-operator GreaterThanThreshold \
        --evaluation-periods 2 \
        --alarm-actions "$TOPIC_ARN" \
        --dimensions Name=DBInstanceIdentifier,Value="$DB_IDENTIFIER" \
        --region "$AWS_REGION"
    
    print_success "CPU utilization alarm created"
    
    # Database Connections Alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "${DB_IDENTIFIER}-high-connections" \
        --alarm-description "RDS instance high connection count" \
        --metric-name DatabaseConnections \
        --namespace AWS/RDS \
        --statistic Average \
        --period 300 \
        --threshold 80 \
        --comparison-operator GreaterThanThreshold \
        --evaluation-periods 2 \
        --alarm-actions "$TOPIC_ARN" \
        --dimensions Name=DBInstanceIdentifier,Value="$DB_IDENTIFIER" \
        --region "$AWS_REGION"
    
    print_success "Database connections alarm created"
    
    # Free Storage Space Alarm (warning at 2GB)
    aws cloudwatch put-metric-alarm \
        --alarm-name "${DB_IDENTIFIER}-low-free-storage" \
        --alarm-description "RDS instance low free storage space" \
        --metric-name FreeStorageSpace \
        --namespace AWS/RDS \
        --statistic Average \
        --period 300 \
        --threshold 2147483648 \
        --comparison-operator LessThanThreshold \
        --evaluation-periods 1 \
        --alarm-actions "$TOPIC_ARN" \
        --dimensions Name=DBInstanceIdentifier,Value="$DB_IDENTIFIER" \
        --region "$AWS_REGION"
    
    print_success "Free storage space alarm created"
    
    # Read Latency Alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "${DB_IDENTIFIER}-high-read-latency" \
        --alarm-description "RDS instance high read latency" \
        --metric-name ReadLatency \
        --namespace AWS/RDS \
        --statistic Average \
        --period 300 \
        --threshold 0.2 \
        --comparison-operator GreaterThanThreshold \
        --evaluation-periods 2 \
        --alarm-actions "$TOPIC_ARN" \
        --dimensions Name=DBInstanceIdentifier,Value="$DB_IDENTIFIER" \
        --region "$AWS_REGION"
    
    print_success "Read latency alarm created"
    
    # Write Latency Alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "${DB_IDENTIFIER}-high-write-latency" \
        --alarm-description "RDS instance high write latency" \
        --metric-name WriteLatency \
        --namespace AWS/RDS \
        --statistic Average \
        --period 300 \
        --threshold 0.2 \
        --comparison-operator GreaterThanThreshold \
        --evaluation-periods 2 \
        --alarm-actions "$TOPIC_ARN" \
        --dimensions Name=DBInstanceIdentifier,Value="$DB_IDENTIFIER" \
        --region "$AWS_REGION"
    
    print_success "Write latency alarm created"
    
    # Freeable Memory Alarm (warning at 100MB)
    aws cloudwatch put-metric-alarm \
        --alarm-name "${DB_IDENTIFIER}-low-freeable-memory" \
        --alarm-description "RDS instance low freeable memory" \
        --metric-name FreeableMemory \
        --namespace AWS/RDS \
        --statistic Average \
        --period 300 \
        --threshold 104857600 \
        --comparison-operator LessThanThreshold \
        --evaluation-periods 2 \
        --alarm-actions "$TOPIC_ARN" \
        --dimensions Name=DBInstanceIdentifier,Value="$DB_IDENTIFIER" \
        --region "$AWS_REGION"
    
    print_success "Freeable memory alarm created"
}

create_custom_dashboard() {
    print_message "Creating CloudWatch dashboard..."
    
    DASHBOARD_NAME="PureOcean-RDS-${DB_IDENTIFIER}"
    
    # Create dashboard JSON
    cat > /tmp/dashboard.json << EOF
{
    "widgets": [
        {
            "type": "metric",
            "x": 0,
            "y": 0,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", "${DB_IDENTIFIER}" ],
                    [ ".", "DatabaseConnections", ".", "." ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "${AWS_REGION}",
                "title": "CPU and Connections",
                "period": 300
            }
        },
        {
            "type": "metric",
            "x": 12,
            "y": 0,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/RDS", "FreeStorageSpace", "DBInstanceIdentifier", "${DB_IDENTIFIER}" ],
                    [ ".", "FreeableMemory", ".", "." ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "${AWS_REGION}",
                "title": "Storage and Memory",
                "period": 300
            }
        },
        {
            "type": "metric",
            "x": 0,
            "y": 6,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/RDS", "ReadLatency", "DBInstanceIdentifier", "${DB_IDENTIFIER}" ],
                    [ ".", "WriteLatency", ".", "." ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "${AWS_REGION}",
                "title": "Read/Write Latency",
                "period": 300
            }
        },
        {
            "type": "metric",
            "x": 12,
            "y": 6,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/RDS", "ReadThroughput", "DBInstanceIdentifier", "${DB_IDENTIFIER}" ],
                    [ ".", "WriteThroughput", ".", "." ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "${AWS_REGION}",
                "title": "Read/Write Throughput",
                "period": 300
            }
        }
    ]
}
EOF

    # Create the dashboard
    aws cloudwatch put-dashboard \
        --dashboard-name "$DASHBOARD_NAME" \
        --dashboard-body file:///tmp/dashboard.json \
        --region "$AWS_REGION"
    
    if [[ $? -eq 0 ]]; then
        print_success "CloudWatch dashboard created: $DASHBOARD_NAME"
        DASHBOARD_URL="https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=${DASHBOARD_NAME}"
        print_message "Dashboard URL: $DASHBOARD_URL"
    else
        print_error "Failed to create dashboard"
    fi
    
    # Clean up
    rm -f /tmp/dashboard.json
}

create_log_monitoring() {
    print_message "Setting up log monitoring..."
    
    # Create log group for custom application metrics
    LOG_GROUP_NAME="/aws/rds/pure-ocean/application-metrics"
    
    aws logs create-log-group \
        --log-group-name "$LOG_GROUP_NAME" \
        --region "$AWS_REGION" 2>/dev/null || true
    
    # Set retention policy
    aws logs put-retention-policy \
        --log-group-name "$LOG_GROUP_NAME" \
        --retention-in-days 7 \
        --region "$AWS_REGION"
    
    print_success "Log monitoring configured"
}

generate_monitoring_report() {
    print_message "Generating monitoring configuration report..."
    
    REPORT_FILE="./monitoring-setup-report.txt"
    
    cat > "$REPORT_FILE" << EOF
Pure Ocean Platform - AWS RDS Monitoring Setup Report
Generated: $(date)
Region: $AWS_REGION
Database: $DB_IDENTIFIER
Email: $EMAIL_ENDPOINT

=== SNS Topic ===
Topic ARN: $(cat /tmp/sns_topic_arn.txt)
Email Subscription: Configured (check email for confirmation)

=== CloudWatch Alarms Created ===
1. ${DB_IDENTIFIER}-high-cpu
   - Metric: CPUUtilization
   - Threshold: > 80% for 10 minutes
   
2. ${DB_IDENTIFIER}-high-connections  
   - Metric: DatabaseConnections
   - Threshold: > 80 connections for 10 minutes
   
3. ${DB_IDENTIFIER}-low-free-storage
   - Metric: FreeStorageSpace
   - Threshold: < 2GB
   
4. ${DB_IDENTIFIER}-high-read-latency
   - Metric: ReadLatency
   - Threshold: > 200ms for 10 minutes
   
5. ${DB_IDENTIFIER}-high-write-latency
   - Metric: WriteLatency  
   - Threshold: > 200ms for 10 minutes
   
6. ${DB_IDENTIFIER}-low-freeable-memory
   - Metric: FreeableMemory
   - Threshold: < 100MB for 10 minutes

=== CloudWatch Dashboard ===
Dashboard: PureOcean-RDS-${DB_IDENTIFIER}
URL: https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=PureOcean-RDS-${DB_IDENTIFIER}

=== Log Monitoring ===
Log Group: /aws/rds/pure-ocean/application-metrics
Retention: 7 days

=== Next Steps ===
1. Confirm email subscription by clicking link in email
2. Test alarms by viewing metrics in CloudWatch console
3. Review dashboard for baseline performance metrics
4. Set up additional custom metrics as needed
5. Consider setting up automated remediation actions

=== Alarm Management Commands ===
List alarms:
aws cloudwatch describe-alarms --region $AWS_REGION --alarm-name-prefix "${DB_IDENTIFIER}-"

Disable alarms (maintenance):
aws cloudwatch disable-alarm-actions --region $AWS_REGION --alarm-names "${DB_IDENTIFIER}-high-cpu"

Enable alarms:
aws cloudwatch enable-alarm-actions --region $AWS_REGION --alarm-names "${DB_IDENTIFIER}-high-cpu"

=== Cost Estimation ===
CloudWatch Metrics (RDS basic): Free (included with RDS)
CloudWatch Alarms: $0.10 per alarm per month = $0.60/month
SNS Email Notifications: First 1,000 free, then $0.50 per 1M notifications
CloudWatch Dashboard: $3.00 per dashboard per month

Estimated Monthly Cost: ~$4/month for monitoring setup
EOF

    print_success "Monitoring report saved: $REPORT_FILE"
}

cleanup() {
    # Clean up temporary files
    rm -f /tmp/sns_topic_arn.txt
}

main() {
    print_message "Starting AWS RDS monitoring setup..."
    echo ""
    
    # Set up cleanup trap
    trap cleanup EXIT
    
    parse_arguments "$@"
    check_dependencies
    validate_configuration
    
    create_sns_topic
    create_cloudwatch_alarms
    create_custom_dashboard
    create_log_monitoring
    generate_monitoring_report
    
    echo ""
    print_success "AWS RDS monitoring setup completed!"
    echo ""
    print_message "Summary:"
    echo "  ✓ SNS topic created for alerts"
    echo "  ✓ 6 CloudWatch alarms configured"
    echo "  ✓ CloudWatch dashboard created"  
    echo "  ✓ Log monitoring configured"
    echo "  ✓ Monitoring report generated"
    echo ""
    print_warning "IMPORTANT: Check your email and confirm the SNS subscription!"
    echo ""
    print_message "Access your monitoring:"
    echo "  - CloudWatch Console: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION"
    echo "  - RDS Console: https://console.aws.amazon.com/rds/home?region=$AWS_REGION"
    echo "  - Dashboard: https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=PureOcean-RDS-${DB_IDENTIFIER}"
    echo ""
    print_message "Configuration report saved to: $(pwd)/monitoring-setup-report.txt"
}

# Show usage if help requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_usage
    exit 0
fi

# Run the main function
main "$@"