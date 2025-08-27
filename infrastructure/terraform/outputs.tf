# Outputs for Pure Ocean RDS Infrastructure

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.pure_ocean_postgres.endpoint
  sensitive   = false
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.pure_ocean_postgres.port
  sensitive   = false
}

output "database_name" {
  description = "Name of the database"
  value       = aws_db_instance.pure_ocean_postgres.db_name
  sensitive   = false
}

output "database_username" {
  description = "Master username for the database"
  value       = aws_db_instance.pure_ocean_postgres.username
  sensitive   = true
}

output "database_password_secret_arn" {
  description = "ARN of the secret containing the database password"
  value       = aws_secretsmanager_secret.db_master_password.arn
  sensitive   = false
}

output "connection_string" {
  description = "PostgreSQL connection string (without password)"
  value       = "postgresql://${aws_db_instance.pure_ocean_postgres.username}:[PASSWORD]@${aws_db_instance.pure_ocean_postgres.endpoint}:${aws_db_instance.pure_ocean_postgres.port}/${aws_db_instance.pure_ocean_postgres.db_name}"
  sensitive   = false
}

output "security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds_security_group.id
  sensitive   = false
}

output "kms_key_id" {
  description = "KMS key ID used for RDS encryption"
  value       = aws_kms_key.rds_encryption_key.key_id
  sensitive   = false
}

output "monitoring_role_arn" {
  description = "ARN of the IAM role for enhanced monitoring"
  value       = aws_iam_role.rds_enhanced_monitoring.arn
  sensitive   = false
}

output "backup_window" {
  description = "Backup window for the RDS instance"
  value       = aws_db_instance.pure_ocean_postgres.backup_window
  sensitive   = false
}

output "maintenance_window" {
  description = "Maintenance window for the RDS instance"
  value       = aws_db_instance.pure_ocean_postgres.maintenance_window
  sensitive   = false
}

# Instructions for connecting to the database
output "connection_instructions" {
  description = "Instructions for connecting to the database"
  value = <<-EOF
    To connect to your PostgreSQL database:
    
    1. Retrieve the password from AWS Secrets Manager:
       aws secretsmanager get-secret-value --secret-id ${aws_secretsmanager_secret.db_master_password.name} --region ${var.aws_region}
    
    2. Connect using psql:
       psql -h ${aws_db_instance.pure_ocean_postgres.endpoint} -p ${aws_db_instance.pure_ocean_postgres.port} -U ${aws_db_instance.pure_ocean_postgres.username} -d ${aws_db_instance.pure_ocean_postgres.db_name}
    
    3. Connection string for applications:
       DATABASE_URL="postgresql://${aws_db_instance.pure_ocean_postgres.username}:[PASSWORD]@${aws_db_instance.pure_ocean_postgres.endpoint}:${aws_db_instance.pure_ocean_postgres.port}/${aws_db_instance.pure_ocean_postgres.db_name}?sslmode=require"
  EOF
  sensitive = false
}

# Cost estimation information
output "estimated_monthly_cost" {
  description = "Estimated monthly cost breakdown (USD)"
  value = <<-EOF
    Estimated Monthly Costs (Seoul region, USD):
    
    RDS Instance (${var.db_instance_class}):
      - On-Demand: ~$13.32/month
      - Reserved (1-year): ~$8.88/month
      - Reserved (3-year): ~$5.91/month
    
    Storage (GP3, ${var.allocated_storage}GB): ~$2.30/month
    
    Backup Storage (7 days): ~$2.30/month (if full backup)
    
    Data Transfer: Minimal (within same AZ)
    
    KMS Key: $1.00/month
    
    Total Estimated: $18-20/month (On-Demand)
                    $13-15/month (1-year Reserved)
    
    Note: Costs may vary based on actual usage, data transfer, and backup storage.
  EOF
  sensitive = false
}