-- Pure Ocean Platform Database Initialization Script
-- This script is automatically executed when PostgreSQL container starts

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'Asia/Seoul';

-- Create database (if it doesn't exist)
-- Note: The database is already created by the POSTGRES_DB environment variable

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE pure_ocean TO postgres;

-- Insert default data will be handled by Prisma seed script
-- This init script only sets up the database structure