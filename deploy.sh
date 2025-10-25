#!/bin/bash

# Elite Tutors Hub - Docker Deployment Script
# This script deploys the tutoring backend application using Docker Compose

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if .env file exists
check_env() {
    print_status "Checking environment configuration..."
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from template..."
        if [ -f ".env.production" ]; then
            cp .env.production .env
            print_warning "Please edit .env file with your production values before continuing"
            print_warning "Run: nano .env"
            exit 1
        else
            print_error ".env.production template not found. Please create .env file manually."
            exit 1
        fi
    fi
    print_success "Environment configuration found"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    mkdir -p nginx/conf.d
    mkdir -p nginx/ssl
    mkdir -p scripts
    print_success "Directories created"
}

# Build and start services
deploy() {
    print_status "Building and starting services..."
    
    # Stop existing containers
    print_status "Stopping existing containers..."
    docker-compose down --remove-orphans
    
    # Build and start services
    print_status "Building Docker images..."
    docker-compose build --no-cache
    
    print_status "Starting services..."
    docker-compose up -d
    
    print_success "Services started successfully"
}

# Wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to be healthy..."
    
    # Wait for database
    print_status "Waiting for database..."
    timeout 60 bash -c 'until docker-compose exec -T postgres pg_isready -U postgres; do sleep 2; done'
    
    # Wait for backend
    print_status "Waiting for backend..."
    timeout 60 bash -c 'until curl -f http://localhost:4000/health; do sleep 2; done'
    
    print_success "All services are healthy"
}

# Show service status
show_status() {
    print_status "Service Status:"
    docker-compose ps
    
    print_status "Service Logs (last 20 lines):"
    docker-compose logs --tail=20
}

# Main deployment function
main() {
    print_status "Starting Elite Tutors Hub deployment..."
    
    check_docker
    check_env
    create_directories
    deploy
    wait_for_services
    show_status
    
    print_success "Deployment completed successfully!"
    print_status "Your application is now running at:"
    print_status "  - Backend API: http://localhost:4000"
    print_status "  - Health Check: http://localhost:4000/health"
    print_status ""
    print_status "To view logs: docker-compose logs -f"
    print_status "To stop services: docker-compose down"
    print_status "To restart services: docker-compose restart"
}

# Handle script arguments
case "${1:-}" in
    "stop")
        print_status "Stopping services..."
        docker-compose down
        print_success "Services stopped"
        ;;
    "restart")
        print_status "Restarting services..."
        docker-compose restart
        print_success "Services restarted"
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "status")
        show_status
        ;;
    "update")
        print_status "Updating services..."
        docker-compose pull
        docker-compose up -d
        print_success "Services updated"
        ;;
    *)
        main
        ;;
esac
