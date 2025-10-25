-- Database initialization script for Elite Tutors Hub
-- This script runs when the PostgreSQL container starts for the first time

-- Create database if it doesn't exist (this is handled by POSTGRES_DB env var)
-- CREATE DATABASE IF NOT EXISTS tutoring;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'Asia/Beirut';

-- Create a backup user (optional, for database management)
-- CREATE USER backup_user WITH PASSWORD 'backup_password';
-- GRANT CONNECT ON DATABASE tutoring TO backup_user;
-- GRANT USAGE ON SCHEMA public TO backup_user;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Elite Tutors Hub database initialized successfully';
    RAISE NOTICE 'Timezone set to: %', current_setting('timezone');
    RAISE NOTICE 'Database created at: %', now();
END $$;
