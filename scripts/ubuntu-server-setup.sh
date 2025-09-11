#!/bin/bash

# Ubuntu Server Setup Script for FormDee
# Run this once on a fresh Ubuntu server to prepare for deployment

echo "🐧 Ubuntu Server Setup for FormDee"
echo "=================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${YELLOW}⚠️  Running as root. It's recommended to run as a regular user with sudo.${NC}"
fi

# Update system
echo -e "\n${YELLOW}1. Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x (LTS)
echo -e "\n${YELLOW}2. Installing Node.js 20.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version

# Install build essentials
echo -e "\n${YELLOW}3. Installing build essentials...${NC}"
sudo apt-get install -y build-essential git

# Install PM2 globally
echo -e "\n${YELLOW}4. Installing PM2...${NC}"
sudo npm install -g pm2
pm2 --version

# Setup PM2 to start on boot
echo -e "\n${YELLOW}5. Setting up PM2 startup...${NC}"
pm2 startup systemd -u $USER --hp /home/$USER
sudo systemctl enable pm2-$USER

# Install nginx (optional, for reverse proxy)
echo -e "\n${YELLOW}6. Installing Nginx (optional)...${NC}"
read -p "Install Nginx for reverse proxy? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo apt-get install -y nginx
    sudo systemctl enable nginx
    echo -e "${GREEN}✓ Nginx installed${NC}"
    
    # Create nginx config
    cat << 'EOF' | sudo tee /etc/nginx/sites-available/formdee
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
    echo -e "${BLUE}ℹ️  Edit /etc/nginx/sites-available/formdee with your domain${NC}"
fi

# Setup swap file (important for low-memory servers)
echo -e "\n${YELLOW}7. Checking swap...${NC}"
SWAP_SIZE=$(swapon --show | tail -n 1 | awk '{print $3}')
if [ -z "$SWAP_SIZE" ]; then
    echo "No swap detected. Creating 4GB swap file..."
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
    echo -e "${GREEN}✓ 4GB swap file created${NC}"
else
    echo -e "${GREEN}✓ Swap already configured: $SWAP_SIZE${NC}"
fi

# Optimize system limits
echo -e "\n${YELLOW}8. Optimizing system limits...${NC}"
cat << 'EOF' | sudo tee -a /etc/security/limits.conf
# FormDee optimizations
* soft nofile 65535
* hard nofile 65535
* soft nproc 32768
* hard nproc 32768
EOF

# Setup firewall
echo -e "\n${YELLOW}9. Setting up firewall...${NC}"
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
echo "y" | sudo ufw enable
sudo ufw status

# Create application directory
echo -e "\n${YELLOW}10. Creating application directory...${NC}"
mkdir -p ~/FormDee
mkdir -p ~/FormDee/logs
echo -e "${GREEN}✓ Directory ~/FormDee created${NC}"

# Install additional tools
echo -e "\n${YELLOW}11. Installing helpful tools...${NC}"
sudo apt-get install -y htop ncdu

# System monitoring setup
echo -e "\n${YELLOW}12. Setting up monitoring...${NC}"
cat << 'EOF' > ~/monitor-formdee.sh
#!/bin/bash
# Quick monitoring script
echo "=== FormDee Server Monitor ==="
echo "System: $(lsb_release -ds)"
echo "Uptime: $(uptime -p)"
echo ""
echo "Memory:"
free -h | grep -E "Mem|Swap"
echo ""
echo "Disk:"
df -h | grep -E "/$|Filesystem"
echo ""
echo "Node processes:"
ps aux | grep -E "node|pm2" | grep -v grep
echo ""
echo "PM2 Status:"
pm2 list
EOF
chmod +x ~/monitor-formdee.sh

echo -e "\n${GREEN}✅ Ubuntu Server Setup Complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Clone your repository:"
echo "   git clone https://github.com/zierocode/FormDee.git ~/FormDee"
echo ""
echo "2. Set up environment variables:"
echo "   cd ~/FormDee && cp .env.example .env"
echo "   nano .env"
echo ""
echo "3. Install dependencies:"
echo "   cd ~/FormDee && npm ci --production=false"
echo ""
echo "4. Run the deployment:"
echo "   ./deploy.sh"
echo ""
echo "5. Monitor the application:"
echo "   ~/monitor-formdee.sh"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "- Ensure you have at least 2GB RAM + 2GB swap"
echo "- Configure your domain in Nginx if installed"
echo "- Set up SSL with Let's Encrypt for production"
echo "- Configure environment variables before deployment"