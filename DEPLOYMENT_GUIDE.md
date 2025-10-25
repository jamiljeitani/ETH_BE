# 🚀 Elite Tutors Hub - Docker Deployment Guide

This guide will help you deploy your tutoring backend application on Hostinger VPS using Docker Compose.

## 📋 Prerequisites

### VPS Requirements
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 20GB SSD
- **CPU**: 2 cores minimum
- **Network**: Public IP with ports 80, 443, and 22 open

### Domain Setup
- Domain name pointing to your VPS IP
- SSL certificate (Let's Encrypt recommended)

## 🛠️ Step 1: VPS Setup

### 1.1 Connect to your VPS
```bash
ssh root@your-vps-ip
```

### 1.2 Update system packages
```bash
apt update && apt upgrade -y
```

### 1.3 Install Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Add user to docker group (if not root)
usermod -aG docker $USER
```

### 1.4 Install additional tools
```bash
apt install -y git curl wget nano htop
```

## 📁 Step 2: Deploy Application

### 2.1 Clone or upload your project
```bash
# Option 1: Clone from Git
git clone https://github.com/yourusername/tutoring-backend.git
cd tutoring-backend

# Option 2: Upload via SCP/SFTP
# Upload your project files to /root/tutoring-backend/
```

### 2.2 Configure environment variables
```bash
# Copy production environment template
cp .env.production .env

# Edit environment variables
nano .env
```

**Important environment variables to update:**
```env
# Database
DB_PASS=your_secure_database_password_here

# JWT Secrets (generate strong secrets)
JWT_SECRET=your_super_secure_jwt_secret_key_here_minimum_32_characters
REFRESH_SECRET=your_super_secure_refresh_secret_key_here_minimum_32_characters

# Domain names
BASE_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Stripe (if using payments)
STRIPE_SECRET=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here
```

### 2.3 Update Nginx configuration
```bash
# Edit Nginx configuration
nano nginx/conf.d/default.conf

# Update server_name with your domain
server_name api.yourdomain.com yourdomain.com;
```

### 2.4 Deploy the application
```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

## 🔧 Step 3: SSL Certificate Setup

### 3.1 Install Certbot
```bash
apt install -y certbot python3-certbot-nginx
```

### 3.2 Obtain SSL certificate
```bash
# Stop Nginx temporarily
docker-compose stop nginx

# Get certificate
certbot certonly --standalone -d api.yourdomain.com -d yourdomain.com

# Copy certificates to Docker volume
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
```

### 3.3 Enable HTTPS in Nginx
```bash
# Edit Nginx configuration
nano nginx/conf.d/default.conf

# Uncomment the HTTPS server block and update paths
```

### 3.4 Restart services
```bash
docker-compose up -d
```

## 🔍 Step 4: Verification

### 4.1 Check service status
```bash
# View running containers
docker-compose ps

# Check logs
docker-compose logs -f

# Test health endpoint
curl http://localhost:4000/health
```

### 4.2 Test API endpoints
```bash
# Test email service
curl -X GET http://localhost:4000/api/v1/email/health

# Test with your domain
curl -X GET https://api.yourdomain.com/health
```

## 🛠️ Management Commands

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f nginx
```

### Restart services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Update application
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Backup database
```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres tutoring > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose exec -T postgres psql -U postgres tutoring < backup_file.sql
```

## 🔒 Security Considerations

### 1. Firewall Configuration
```bash
# Install UFW
apt install -y ufw

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80
ufw allow 443
ufw enable
```

### 2. Database Security
- Use strong passwords
- Limit database access to application only
- Regular backups
- Monitor database logs

### 3. Application Security
- Keep dependencies updated
- Use environment variables for secrets
- Enable HTTPS
- Regular security audits

## 📊 Monitoring

### 1. System monitoring
```bash
# Install monitoring tools
apt install -y htop iotop nethogs

# View system resources
htop
```

### 2. Application monitoring
```bash
# Check container resources
docker stats

# View application logs
docker-compose logs -f backend
```

### 3. Database monitoring
```bash
# Connect to database
docker-compose exec postgres psql -U postgres tutoring

# Check database size
SELECT pg_size_pretty(pg_database_size('tutoring'));

# Check active connections
SELECT count(*) FROM pg_stat_activity;
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Services won't start
```bash
# Check logs
docker-compose logs

# Check environment variables
docker-compose config

# Verify Docker is running
systemctl status docker
```

#### 2. Database connection issues
```bash
# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres pg_isready -U postgres
```

#### 3. Nginx issues
```bash
# Check Nginx configuration
docker-compose exec nginx nginx -t

# Check Nginx logs
docker-compose logs nginx
```

#### 4. Email service issues
```bash
# Test email configuration
curl -X POST http://localhost:4000/api/v1/email/test \
  -H "Content-Type: application/json" \
  -d '{"testEmail": "your-email@example.com"}'
```

## 📞 Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify environment variables: `docker-compose config`
3. Test individual services: `docker-compose ps`
4. Check system resources: `htop` and `df -h`

## 🎉 Success!

Once deployed successfully, your application will be available at:
- **API**: `https://api.yourdomain.com`
- **Health Check**: `https://api.yourdomain.com/health`
- **Email Service**: `https://api.yourdomain.com/api/v1/email/health`

Your Elite Tutors Hub backend is now running in production! 🚀
