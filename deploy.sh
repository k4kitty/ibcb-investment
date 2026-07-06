#!/bin/bash
# IBCB Investment — VPS 一鍵部署腳本
# 在 Ubuntu 20.04/22.04 上執行: bash deploy.sh

set -e

APP_DIR="/opt/ibcb-investment"
DOMAIN="ibcbinvestment.com"   # ← 改為你的域名

echo "=== 1. 安裝系統依賴 ==="
sudo apt update
sudo apt install -y curl nginx certbot python3-certbot-nginx

echo "=== 2. 安裝 Node.js 20 ==="
if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
    sudo apt install -y nodejs
fi

echo "=== 3. 複製專案 ==="
sudo mkdir -p $APP_DIR
sudo cp -r ./* $APP_DIR/
sudo chown -R $USER:$USER $APP_DIR
cd $APP_DIR

echo "=== 4. 安裝 npm 依賴 ==="
npm install --production

echo "=== 5. 配置環境變量 ==="
if [ ! -f .env ]; then
    SESSION_KEY=$(openssl rand -hex 32)
    cat > .env << EOF
PORT=3000
NODE_ENV=production
SESSION_SECRET=$SESSION_KEY
EOF
    echo "已生成 .env，SESSION_SECRET=$SESSION_KEY"
    echo "如需電郵功能，請編輯 .env 添加 SMTP_* 設定"
fi

echo "=== 6. 安裝 PM2 ==="
sudo npm install -g pm2
pm2 start server.js --name ibcb --cwd $APP_DIR
pm2 save
pm2 startup | bash

echo "=== 7. 配置 nginx ==="
sudo tee /etc/nginx/sites-available/ibcb > /dev/null << NGINX
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/ibcb /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo "=== 8. SSL 憑證 ==="
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m admin@ibcgroup.com.hk || true

echo ""
echo "=== 部署完成 ==="
echo "網站: https://$DOMAIN"
echo "後台: https://$DOMAIN/admin.html"
echo "PM2:  pm2 status"
echo "日誌:  pm2 logs ibcb"