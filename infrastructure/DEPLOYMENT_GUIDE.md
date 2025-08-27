# Pure Ocean Platform - AWS RDS Migration Guide

This guide provides step-by-step instructions for migrating the Pure Ocean Platform from Railway PostgreSQL to AWS RDS PostgreSQL.

## Overview

**Migration Process:**
1. Export data from Railway PostgreSQL
2. Provision AWS RDS PostgreSQL instance
3. Import data to AWS RDS
4. Update EC2 environment variables
5. Test and verify the migration
6. Set up monitoring and alerting

**Estimated Time:** 2-3 hours  
**Estimated Cost:** ~$18-20/month for RDS setup

## Prerequisites

### Required Tools
- AWS CLI configured with appropriate permissions
- Terraform >= 1.0
- PostgreSQL client tools (psql, pg_dump)
- SSH access to EC2 instance
- Railway PostgreSQL access credentials

### Required AWS Permissions
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "rds:*",
                "ec2:DescribeInstances",
                "ec2:DescribeVpcs",
                "ec2:DescribeSubnets",
                "ec2:DescribeSecurityGroups",
                "ec2:CreateSecurityGroup",
                "ec2:AuthorizeSecurityGroupIngress",
                "kms:CreateKey",
                "kms:CreateAlias",
                "secretsmanager:CreateSecret",
                "secretsmanager:PutSecretValue",
                "iam:CreateRole",
                "iam:AttachRolePolicy",
                "cloudwatch:PutMetricAlarm",
                "sns:CreateTopic",
                "sns:Subscribe"
            ],
            "Resource": "*"
        }
    ]
}
```

### Railway Access
You'll need the following from your Railway PostgreSQL service:
- Host (e.g., `containers-us-west-1.railway.app`)
- Port (usually `5432`)
- Database name
- Username
- Password

## Step 1: Prepare Environment

### 1.1 Clone and Navigate to Infrastructure Directory
```bash
cd /Users/jihunkong/POProject/infrastructure
```

### 1.2 Install Dependencies
```bash
# Install Terraform (if not already installed)
brew install terraform

# Install PostgreSQL client tools (if not already installed)
brew install postgresql

# Verify AWS CLI configuration
aws sts get-caller-identity
```

### 1.3 Set Environment Variables
```bash
# Railway Database (get these from Railway dashboard)
export RAILWAY_HOST="containers-us-west-1.railway.app"
export RAILWAY_PORT="5432"
export RAILWAY_DATABASE="railway"
export RAILWAY_USER="postgres"
export RAILWAY_PASSWORD="your-railway-password"

# AWS Configuration
export AWS_REGION="ap-northeast-2"
export EC2_HOST="ec2-15-164-169-201.ap-northeast-2.compute.amazonaws.com"
```

## Step 2: Export Railway Data

### 2.1 Run Data Export Script
```bash
chmod +x scripts/export-railway-data.sh
./scripts/export-railway-data.sh
```

This will create:
- `backups/TIMESTAMP/schema.sql` - Database schema
- `backups/TIMESTAMP/data.sql` - Database data  
- `backups/TIMESTAMP/full_backup.sql` - Complete backup
- `backups/TIMESTAMP/verify_migration.sql` - Verification script

### 2.2 Verify Export
```bash
ls -la backups/*/
# Check file sizes - they should not be empty
```

## Step 3: Deploy AWS RDS Infrastructure

### 3.1 Review Terraform Configuration
```bash
cd terraform/

# Review variables and adjust if needed
cat variables.tf

# Optional: Create terraform.tfvars for custom values
cat > terraform.tfvars << EOF
project_name = "pure-ocean"
environment = "production"
db_instance_class = "db.t3.micro"
allocated_storage = 20
backup_retention_period = 7
deletion_protection = true
EOF
```

### 3.2 Initialize and Plan Terraform
```bash
terraform init
terraform plan
```

### 3.3 Apply Terraform Configuration
```bash
# Deploy infrastructure
terraform apply

# Review the plan and type 'yes' to confirm
# This will take 10-15 minutes to complete
```

### 3.4 Capture Outputs
```bash
# Save important outputs
terraform output > ../rds_outputs.txt

# Get specific values
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
echo "RDS Endpoint: $RDS_ENDPOINT"
```

## Step 4: Import Data to AWS RDS

### 4.1 Set RDS Connection Variables
```bash
cd ../scripts/

# Set RDS credentials (get password from AWS Secrets Manager)
export RDS_ENDPOINT=$(terraform -chdir=../terraform output -raw rds_endpoint)
export RDS_PASSWORD=$(aws secretsmanager get-secret-value \
    --secret-id $(terraform -chdir=../terraform output -raw database_password_secret_arn) \
    --region ap-northeast-2 \
    --query 'SecretString' --output text | grep -o '"password":"[^"]*"' | cut -d'"' -f4)
```

### 4.2 Run Data Import
```bash
chmod +x import-to-rds.sh

# Find your backup directory
BACKUP_DIR=$(find ../backups -name "20*" -type d | sort | tail -n 1)
echo "Using backup: $BACKUP_DIR"

# Run import
./import-to-rds.sh "$BACKUP_DIR"
```

### 4.3 Verify Import
```bash
# Check import results
cat "$BACKUP_DIR/verification_results.txt"

# Manual verification
psql -h "$RDS_ENDPOINT" -p 5432 -U postgres -d pure_ocean_production
# Run some test queries:
# \dt  -- list tables
# SELECT COUNT(*) FROM "User";
# SELECT COUNT(*) FROM "Team";
# \q
```

## Step 5: Update EC2 Environment

### 5.1 Prepare SSH Access
```bash
# Ensure your SSH key has correct permissions
chmod 400 ~/.ssh/your-key.pem

# Test SSH connection
ssh -i ~/.ssh/your-key.pem ubuntu@ec2-15-164-169-201.ap-northeast-2.compute.amazonaws.com "echo 'Connection successful'"
```

### 5.2 Get New Database URL
```bash
# The import script should have created this file
NEW_DATABASE_URL=$(grep 'DATABASE_URL=' "$BACKUP_DIR/new_database_url.env" | cut -d'"' -f2)
export NEW_DATABASE_URL
echo "New DATABASE_URL: $NEW_DATABASE_URL"
```

### 5.3 Update EC2 Environment
```bash
chmod +x update-ec2-environment.sh

./update-ec2-environment.sh \
    --user ubuntu \
    --key ~/.ssh/your-key.pem \
    --dir /home/ubuntu/POProject
```

## Step 6: Test Application

### 6.1 Verify Application Status
```bash
# Run health check on EC2
ssh -i ~/.ssh/your-key.pem ubuntu@$EC2_HOST '/home/ubuntu/POProject/health_check.sh'
```

### 6.2 Test Website
```bash
# Test application endpoint
curl -I http://ec2-15-164-169-201.ap-northeast-2.compute.amazonaws.com

# Or open in browser:
# http://ec2-15-164-169-201.ap-northeast-2.compute.amazonaws.com
```

### 6.3 Test Database Functionality
1. Log into the application
2. Create a test user account
3. Create a team
4. Send a message to the chatbot
5. Verify data persists after browser refresh

## Step 7: Set Up Monitoring

### 7.1 Configure Monitoring and Alerts
```bash
chmod +x monitoring-setup.sh

./monitoring-setup.sh \
    --email admin@wando.hs.kr \
    --db-id pure-ocean-production-postgres \
    --region ap-northeast-2
```

### 7.2 Confirm Email Subscription
1. Check your email for SNS subscription confirmation
2. Click the confirmation link
3. Verify you receive test alerts

### 7.3 Access Monitoring Dashboard
1. Go to AWS CloudWatch Console
2. Navigate to Dashboards
3. Open "PureOcean-RDS-pure-ocean-production-postgres"
4. Bookmark for regular monitoring

## Step 8: Post-Migration Tasks

### 8.1 Update Documentation
```bash
# Update any internal documentation with new DATABASE_URL format
# Update CI/CD pipelines if applicable
# Update any backup scripts to point to RDS
```

### 8.2 Clean Up Railway
```bash
# After confirming everything works for at least 48 hours:
# 1. Download final backup from Railway (optional)
# 2. Delete Railway PostgreSQL service to stop billing
# 3. Remove Railway environment variables from any scripts
```

### 8.3 Schedule Regular Maintenance
```bash
# Set up regular tasks:
# 1. Weekly verification of backups
# 2. Monthly cost review
# 3. Quarterly performance review
# 4. Semi-annual security review
```

## Rollback Procedure

If you need to rollback to Railway:

### Quick Rollback
```bash
# 1. SSH to EC2 instance
ssh -i ~/.ssh/your-key.pem ubuntu@$EC2_HOST

# 2. Restore old environment
cd /home/ubuntu/POProject
cp backups/env_TIMESTAMP/.env.backup .env

# 3. Restart application
pm2 restart all
```

### Complete Rollback
```bash
# 1. Export current RDS data (if changes were made)
pg_dump -h $RDS_ENDPOINT -p 5432 -U postgres -d pure_ocean_production > rollback_backup.sql

# 2. Follow quick rollback steps above

# 3. Optionally destroy RDS infrastructure
cd terraform/
terraform destroy
```

## Troubleshooting

### Common Issues

#### Cannot Connect to RDS
```bash
# Check security group allows EC2 access
aws ec2 describe-security-groups --group-ids $(terraform output -raw security_group_id)

# Test connection from EC2
ssh -i ~/.ssh/your-key.pem ubuntu@$EC2_HOST "telnet $RDS_ENDPOINT 5432"
```

#### Application Won't Start
```bash
# Check application logs
ssh -i ~/.ssh/your-key.pem ubuntu@$EC2_HOST "cd /home/ubuntu/POProject && tail -50 app.log"

# Check Prisma connection
ssh -i ~/.ssh/your-key.pem ubuntu@$EC2_HOST "cd /home/ubuntu/POProject && npx prisma db pull"
```

#### Data Import Errors
```bash
# Check import logs
cat "$BACKUP_DIR/schema_import.log"
cat "$BACKUP_DIR/data_import.log"

# Common fixes:
# 1. Ensure sequences are updated
# 2. Check for foreign key constraint issues
# 3. Verify character encoding
```

### Getting Help

#### Log Files to Check
- `$BACKUP_DIR/schema_import.log` - Schema import errors
- `$BACKUP_DIR/data_import.log` - Data import errors  
- `$BACKUP_DIR/verification_results.txt` - Migration verification
- `/home/ubuntu/POProject/app.log` - Application logs

#### AWS Resources to Monitor
- CloudWatch Logs: `/aws/rds/instance/pure-ocean-production-postgres/postgresql`
- RDS Events: Check RDS console for maintenance events
- CloudWatch Metrics: Monitor database performance

## Cost Optimization

### Monthly Cost Breakdown
```
RDS db.t3.micro:           ~$13.32/month (On-Demand)
                          ~$8.88/month (1-year Reserved Instance)
GP3 Storage (20GB):       ~$2.30/month  
Backup Storage:           ~$2.30/month (if full backup)
KMS Key:                  $1.00/month
CloudWatch Monitoring:    ~$4.00/month
Data Transfer:            Minimal (same AZ)
Total:                    ~$23/month (On-Demand)
                         ~$18/month (Reserved Instance)
```

### Cost Optimization Tips
1. Purchase Reserved Instance after 30 days if usage is consistent
2. Enable storage autoscaling to avoid over-provisioning
3. Adjust backup retention based on actual needs
4. Monitor unused resources with AWS Cost Explorer
5. Use AWS Budgets to set spending alerts

## Security Best Practices

### Implemented Security Features
- ✅ Encryption at rest with customer-managed KMS key
- ✅ Encryption in transit (SSL/TLS required)
- ✅ Network isolation (private subnets, security groups)
- ✅ Automated backups with encryption
- ✅ Enhanced monitoring enabled
- ✅ Parameter group with security settings
- ✅ Secrets Manager for credential management

### Additional Recommendations
1. Enable VPC Flow Logs for network monitoring
2. Set up AWS Config for compliance monitoring
3. Implement database activity monitoring (if required)
4. Regular security scans with AWS Inspector
5. Review IAM policies quarterly

## Performance Tuning

### PostgreSQL Optimization
The RDS parameter group includes optimizations for the t3.micro instance:
- `shared_buffers`: 25% of available memory
- `effective_cache_size`: 75% of available memory  
- `max_connections`: 100 (appropriate for small instance)
- `maintenance_work_mem`: 64MB

### Monitoring Performance
1. Use Performance Insights (enabled by default)
2. Monitor slow query log (enabled for queries > 1 second)
3. Set up custom CloudWatch metrics for application-specific metrics
4. Review connection pooling in your Next.js application

## Final Checklist

- [ ] Railway data exported successfully
- [ ] AWS RDS instance created and accessible
- [ ] Data imported and verified
- [ ] EC2 environment updated
- [ ] Application tested and working
- [ ] Monitoring and alerts configured
- [ ] Email subscription confirmed
- [ ] Documentation updated
- [ ] Team notified of new infrastructure
- [ ] Old Railway service scheduled for cleanup
- [ ] Backup verification scheduled
- [ ] Performance baseline established

## Support and Maintenance

### Regular Tasks
- **Daily**: Monitor CloudWatch dashboard
- **Weekly**: Review backup status and test restoration
- **Monthly**: Review costs and performance metrics
- **Quarterly**: Update security groups and review access
- **Annually**: Review instance sizing and Reserved Instance options

### Emergency Contacts
- AWS Support (if applicable)
- Database administrator contact
- Infrastructure team contact
- Application team contact

---

**Migration completed successfully!** 🎉

Your Pure Ocean Platform is now running on AWS RDS PostgreSQL with enterprise-grade reliability, security, and monitoring.

For questions or issues, refer to the troubleshooting section or contact the infrastructure team.