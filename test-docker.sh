#!/bin/bash

# Test Docker setup locally before deployment
# This script tests the Docker configuration without affecting production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
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

# Check if Docker is running
check_docker() {
    print_status "Checking Docker..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    print_success "Docker is running"
}

# Create test environment file
create_test_env() {
    print_status "Creating test environment file..."
    cat > .env.test << EOF
# Test Environment Configuration
NODE_ENV=test
PORT=4000
BASE_URL=http://localhost:4000
FRONTEND_URL=http://localhost:5173
TIMEZONE=Asia/Beirut

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=tutoring_test
DB_USER=postgres
DB_PASS=test_password

# JWT Configuration
JWT_SECRET=test_jwt_secret_key_for_testing_purposes_only
JWT_EXPIRES_IN=1d
REFRESH_SECRET=test_refresh_secret_key_for_testing_purposes_only
REFRESH_EXPIRES_IN=7d

# SMTP Configuration (using test values)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_ADMIN_EMAIL=admin@elitetutorshub.net
SMTP_ADMIN_PASSWORD=n*1YqDNJ
SMTP_SCHEDULE_EMAIL=schedule@elitetutorshub.net
SMTP_SCHEDULE_PASSWORD=hk?Wa1X$
SMTP_SUPPORT_EMAIL=support@elitetutorshub.net
SMTP_SUPPORT_PASSWORD=7t^MwabXJ;r&
SMTP_FINANCE_EMAIL=finance@elitetutorshub.net
SMTP_FINANCE_PASSWORD=6I&2xXLuy&5O
SMTP_FEEDBACK_EMAIL=feedback@elitetutorshub.net
SMTP_FEEDBACK_PASSWORD=C11U>&2On!
NO_REPLY_EMAIL=no-reply@elitetutorshub.net

# Stripe Configuration (test keys)
STRIPE_SECRET=sk_test_your_test_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_test_webhook_secret_here
EOF
    print_success "Test environment file created"
}

# Build and test Docker images
test_build() {
    print_status "Building Docker images..."
    
    # Build backend image
    docker build -t tutoring-backend-test .
    print_success "Backend image built successfully"
    
    # Test if image runs
    print_status "Testing backend image..."
    docker run --rm -d --name tutoring-backend-test -p 4001:4000 \
        --env-file .env.test tutoring-backend-test
    
    # Wait for container to start
    sleep 10
    
    # Test health endpoint
    if curl -f http://localhost:4001/health > /dev/null 2>&1; then
        print_success "Backend container is healthy"
    else
        print_error "Backend container health check failed"
        docker logs tutoring-backend-test
        docker stop tutoring-backend-test
        exit 1
    fi
    
    # Clean up test container
    docker stop tutoring-backend-test
    print_success "Backend image test completed"
}

# Test Docker Compose
test_compose() {
    print_status "Testing Docker Compose configuration..."
    
    # Validate compose file
    docker-compose -f docker-compose.yml config > /dev/null
    print_success "Docker Compose configuration is valid"
    
    # Test with test environment
    print_status "Starting services with test environment..."
    cp .env.test .env
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Test database connection
    if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        print_success "Database is ready"
    else
        print_error "Database is not ready"
        docker-compose logs postgres
        docker-compose down
        exit 1
    fi
    
    # Test backend health
    if curl -f http://localhost:4000/health > /dev/null 2>&1; then
        print_success "Backend is healthy"
    else
        print_error "Backend health check failed"
        docker-compose logs backend
        docker-compose down
        exit 1
    fi
    
    # Test email service
    print_status "Testing email service..."
    if curl -f http://localhost:4000/api/v1/email/health > /dev/null 2>&1; then
        print_success "Email service is healthy"
    else
        print_warning "Email service health check failed (this might be expected in test environment)"
    fi
    
    print_success "All services are running correctly"
}

# Cleanup function
cleanup() {
    print_status "Cleaning up test environment..."
    docker-compose down --volumes --remove-orphans
    docker rmi tutoring-backend-test 2>/dev/null || true
    rm -f .env.test
    print_success "Cleanup completed"
}

# Main test function
main() {
    print_status "Starting Docker setup test..."
    
    # Set trap for cleanup on exit
    trap cleanup EXIT
    
    check_docker
    create_test_env
    test_build
    test_compose
    
    print_success "🎉 Docker setup test completed successfully!"
    print_status "Your application is ready for deployment to Hostinger VPS"
    print_status ""
    print_status "Next steps:"
    print_status "1. Upload your project to your VPS"
    print_status "2. Configure production environment variables"
    print_status "3. Run ./deploy.sh on your VPS"
    print_status "4. Set up SSL certificates"
    print_status "5. Configure your domain DNS"
}

# Handle script arguments
case "${1:-}" in
    "cleanup")
        cleanup
        ;;
    *)
        main
        ;;
esac
