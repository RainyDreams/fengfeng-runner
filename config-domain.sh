#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[✓]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

DOMAIN="ff.linkbrain.top"
APP_PORT=3000
NGINX_CONF="/etc/nginx/sites-available/fengfeng-runner"

if [ "$(id -u)" -ne 0 ]; then
    log_error "请使用 root 用户运行: sudo bash config-domain.sh"
    exit 1
fi

echo ""
echo -e "${YELLOW}━━━ 配置域名访问：${DOMAIN} ━━━${NC}"
echo ""

# 配置 Nginx：拒绝 IP 直接访问，只允许域名
cat > "$NGINX_CONF" << EOF
# 拒绝 IP 直接访问
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    return 444;
}

# 允许域名访问
server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 1m;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 静态资源
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|m4a|woff|woff2|ttf|eot)$ {
        root /opt/fengfeng-runner/dist;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API 和页面
    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # 屏蔽 favicon.ico 日志
    location = /favicon.ico {
        root /opt/fengfeng-runner/dist;
        log_not_found off;
        access_log off;
    }
}
EOF

# 测试并重载
if nginx -t 2>&1; then
    systemctl reload nginx
    log_info "Nginx 配置完成"
else
    log_error "Nginx 配置有误"
    exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  配置完成!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  域名访问: ${GREEN}http://${DOMAIN}${NC}"
echo -e "  IP 直接访问: ${RED}已拒绝 (返回 444)${NC}"
echo ""
echo -e "  ${YELLOW}注意: 请确保 DNS 已解析 ${DOMAIN} -> 你的服务器 IP${NC}"
echo ""
