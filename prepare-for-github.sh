#!/bin/bash

# Elite Tutors Hub - Prepare Files for GitHub Deployment
# This script prepares all necessary files for GitHub deployment

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

print_status "🚀 Preparing Elite Tutors Hub for GitHub deployment..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    print_status "Initializing Git repository..."
    git init
    print_success "Git repository initialized"
fi

# Add all necessary files
print_status "Adding files to Git..."

# Core Docker files
git add Dockerfile
git add docker-compose.yml
git add .dockerignore

# Environment configuration
git add production.env

# Nginx configuration
git add nginx/nginx.conf
git add nginx/conf.d/default.conf

# Database scripts
git add scripts/init-db.sql

# Deployment scripts and documentation
git add deploy.sh
git add test-docker.sh
git add HOSTINGER_DEPLOYMENT_INSTRUCTIONS.md
git add DEPLOYMENT_GUIDE.md
git add DOCKER_DEPLOYMENT_SUMMARY.md

# Application files (excluding sensitive files)
git add app.js
git add server.js
git add package.json
git add package-lock.json

# Add all source code directories
git add controllers/
git add models/
git add routes/
git add services/
git add middlewares/
git add utils/
git add validators/
git add config/
git add lib/
git add migrations/
git add scripts/

# Add documentation files
git add *.md

print_success "Files added to Git"

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    print_status "Creating .gitignore file..."
    cat > .gitignore << EOF
# Environment files
.env
.env.local
.env.development
.env.test
.env.production

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage

# Dependency directories
node_modules/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Uploads (keep structure but not files)
uploads/*
!uploads/.gitkeep

# Temporary files
tmp/
temp/
EOF
    print_success ".gitignore created"
fi

# Add .gitignore
git add .gitignore

# Create uploads directory structure
print_status "Creating uploads directory structure..."
mkdir -p uploads/avatars
touch uploads/.gitkeep
touch uploads/avatars/.gitkeep
git add uploads/

print_success "Uploads directory structure created"

# Check git status
print_status "Git status:"
git status

print_success "🎉 Files prepared for GitHub deployment!"
print_status ""
print_status "Next steps:"
print_status "1. Commit your changes:"
print_status "   git commit -m 'Add Docker deployment configuration'"
print_status ""
print_status "2. Add your GitHub remote:"
print_status "   git remote add origin https://github.com/jamiljeitani/ETH_BE.git"
print_status ""
print_status "3. Push to GitHub:"
print_status "   git push -u origin main"
print_status ""
print_status "4. Make repository public in GitHub settings"
print_status ""
print_status "5. Deploy via Hostinger Docker Manager using:"
print_status "   https://github.com/jamiljeitani/ETH_BE.git"
print_status ""
print_warning "Remember to make your repository PUBLIC for Hostinger to access it!"
