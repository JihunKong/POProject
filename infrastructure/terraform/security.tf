# Security and Encryption Configuration for Pure Ocean RDS

# KMS Key for RDS encryption
resource "aws_kms_key" "rds_encryption_key" {
  description             = "KMS key for Pure Ocean RDS encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "${var.project_name}-rds-kms-key"
  }
}

resource "aws_kms_alias" "rds_encryption_key_alias" {
  name          = "alias/${var.project_name}-rds-encryption"
  target_key_id = aws_kms_key.rds_encryption_key.key_id
}

# IAM Role for RDS Enhanced Monitoring
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "${var.project_name}-rds-enhanced-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-rds-monitoring-role"
  }
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# DB Parameter Group for PostgreSQL optimization
resource "aws_db_parameter_group" "pure_ocean_postgres" {
  family = "postgres15"
  name   = "${var.project_name}-${var.environment}-postgres15"

  # Connection and authentication parameters
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries taking more than 1 second
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  # Performance optimization for small instance
  parameter {
    name  = "max_connections"
    value = "100"
  }

  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4}"
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "64MB"
  }

  parameter {
    name  = "checkpoint_completion_target"
    value = "0.9"
  }

  parameter {
    name  = "wal_buffers"
    value = "16MB"
  }

  parameter {
    name  = "default_statistics_target"
    value = "100"
  }

  parameter {
    name  = "random_page_cost"
    value = "1.1"
  }

  tags = {
    Name = "${var.project_name}-postgres-parameters"
  }
}

# CloudWatch Log Group for RDS logs
resource "aws_cloudwatch_log_group" "rds_postgresql_log" {
  name              = "/aws/rds/instance/${var.project_name}-${var.environment}-postgres/postgresql"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-rds-postgresql-logs"
  }
}

resource "aws_cloudwatch_log_group" "rds_upgrade_log" {
  name              = "/aws/rds/instance/${var.project_name}-${var.environment}-postgres/upgrade"
  retention_in_days = 30

  tags = {
    Name = "${var.project_name}-rds-upgrade-logs"
  }
}