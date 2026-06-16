#!/bin/bash

set -e

APP_PORT=3000
NGINX_CONF="/etc/nginx/sites-available/fengfeng-runner"

if [ "$(id -u)" -ne 0 ]; then
    echo "请使用 root 运行: sudo bash config-ip.sh"
    exit 1
fi

cat > "$NGINX_CONF" << EOF
server {
    listen 80;
    server_name _;

    client_max_body_size 1m;

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|m4a|woff|woff2)$ {
        root /opt/fengfeng-runner/dist;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

nginx -t 2>&1 && systemctl reload nginx
echo "[✓] 已配置为 IP 可直接访问"
