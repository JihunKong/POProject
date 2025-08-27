# Pure Ocean Platform - AWS RDS PostgreSQL Infrastructure
# This Terraform configuration creates a production-ready RDS PostgreSQL instance
# for the Pure Ocean educational platform

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }

  # Backend configuration for state management
  # Uncomment and configure for production use
  # backend "s3" {
  #   bucket = "your-terraform-state-bucket"
  #   key    = "pure-ocean/rds/terraform.tfstate"
  #   region = "ap-northeast-2"
  # }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "PureOcean"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "WandoHighSchool"
    }
  }
}

# Data source for existing EC2 instance
data "aws_instance" "pure_ocean_ec2" {
  filter {
    name   = "public-dns-name"
    values = [var.ec2_public_dns]
  }
  
  filter {
    name   = "instance-state-name"
    values = ["running"]
  }
}

# Data source for VPC (using default VPC)
data "aws_vpc" "default" {
  default = true
}

# Data source for subnets in the VPC
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  
  filter {
    name   = "availability-zone"
    values = ["ap-northeast-2a", "ap-northeast-2c"]
  }
}

# Generate random password for RDS master user
resource "random_password" "db_master_password" {
  length  = 32
  special = true
  
  # Avoid characters that might cause issues in connection strings
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Store password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_master_password" {
  name        = "${var.project_name}-${var.environment}-rds-password"
  description = "Master password for Pure Ocean RDS PostgreSQL instance"
  
  tags = {
    Name = "${var.project_name}-rds-master-password"
  }
}

resource "aws_secretsmanager_secret_version" "db_master_password" {
  secret_id     = aws_secretsmanager_secret.db_master_password.id
  secret_string = jsonencode({
    username = var.db_master_username
    password = random_password.db_master_password.result
  })
}

# Security Group for RDS instance
resource "aws_security_group" "rds_security_group" {
  name_prefix = "${var.project_name}-rds-"
  description = "Security group for Pure Ocean RDS PostgreSQL instance"
  vpc_id      = data.aws_vpc.default.id

  # Allow PostgreSQL access from EC2 instance
  ingress {
    description = "PostgreSQL access from Pure Ocean EC2 instance"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["${data.aws_instance.pure_ocean_ec2.private_ip}/32"]
  }

  # Allow access from EC2 security group (more flexible)
  ingress {
    description     = "PostgreSQL access from EC2 security group"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [data.aws_instance.pure_ocean_ec2.security_groups[0]]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}

# DB Subnet Group
resource "aws_db_subnet_group" "pure_ocean_subnet_group" {
  name       = "${var.project_name}-${var.environment}-subnet-group"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "pure_ocean_postgres" {
  identifier = "${var.project_name}-${var.environment}-postgres"

  # Engine Configuration
  engine         = "postgres"
  engine_version = var.postgres_version
  instance_class = var.db_instance_class

  # Database Configuration
  db_name  = var.db_name
  username = var.db_master_username
  password = random_password.db_master_password.result
  port     = 5432

  # Storage Configuration
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.rds_encryption_key.arn

  # Network Configuration
  db_subnet_group_name   = aws_db_subnet_group.pure_ocean_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_security_group.id]
  publicly_accessible    = false

  # Backup Configuration
  backup_retention_period = var.backup_retention_period
  backup_window          = "03:00-04:00" # UTC (12:00-13:00 KST)
  maintenance_window     = "sun:04:00-sun:05:00" # UTC (13:00-14:00 KST)
  
  # Enable automated backups
  delete_automated_backups = false
  
  # Performance Insights
  performance_insights_enabled = true
  performance_insights_retention_period = 7

  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # Security
  deletion_protection = var.deletion_protection
  skip_final_snapshot = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  # Parameter Group
  parameter_group_name = aws_db_parameter_group.pure_ocean_postgres.name

  tags = {
    Name        = "${var.project_name}-postgresql"
    Backup      = "Required"
    Environment = var.environment
  }

  depends_on = [
    aws_kms_key.rds_encryption_key,
    aws_iam_role_policy_attachment.rds_enhanced_monitoring
  ]
}