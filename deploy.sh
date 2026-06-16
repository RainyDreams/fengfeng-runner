#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_step() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }

APP_NAME="fengfeng-runner"
APP_DIR="/opt/${APP_NAME}"
APP_PORT=3000
NODE_VERSION="18"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

check_root() {
    if [ "$(id -u)" -ne 0 ]; then
        log_error "请使用 root 用户运行此脚本"
        log_info "sudo bash deploy.sh"
        exit 1
    fi
}

check_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    else
        log_error "无法识别操作系统"
        exit 1
    fi
    log_info "系统: $OS"
}

check_port() {
    if ss -tlnp 2>/dev/null | grep -q ":${APP_PORT} "; then
        log_warn "端口 ${APP_PORT} 已被占用"
        read -p "是否更换端口? [Y/n]: " choice
        if [[ ! "$choice" =~ ^[Nn]$ ]]; then
            read -p "请输入新端口: " APP_PORT
            log_info "使用端口: $APP_PORT"
        else
            log_error "端口被占用"
            exit 1
        fi
    fi
}

install_node() {
    if command -v node &> /dev/null; then
        local ver=$(node -v | sed 's/v//' | cut -d. -f1)
        if [ "$ver" -ge "$NODE_VERSION" ]; then
            log_info "Node.js $(node -v) 已安装"
            return
        fi
    fi

    log_step "安装 Node.js ${NODE_VERSION}"
    case $OS in
        ubuntu|debian)
            curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
            apt-get install -y nodejs
            ;;
        centos|almalinux|rocky|fedora)
            curl -fsSL "https://rpm.nodesource.com/setup_${NODE_VERSION}.x" | bash -
            yum install -y nodejs
            ;;
        *)
            log_error "请手动安装 Node.js ${NODE_VERSION}+"
            exit 1
            ;;
    esac
    log_info "Node.js $(node -v) 安装完成"
}

install_build_tools() {
    log_step "安装构建工具（SQLite 编译需要）"
    case $OS in
        ubuntu|debian)
            apt-get install -y build-essential python3
            ;;
        centos|almalinux|rocky|fedora)
            yum groupinstall -y "Development Tools"
            yum install -y python3
            ;;
    esac
    log_info "构建工具安装完成"
}

install_nginx() {
    if command -v nginx &> /dev/null; then
        log_info "Nginx 已安装"
        return
    fi
    log_step "安装 Nginx"
    case $OS in
        ubuntu|debian) apt-get install -y nginx ;;
        centos|almalinux|rocky|fedora) yum install -y nginx ;;
    esac
    systemctl enable nginx
    systemctl start nginx
    log_info "Nginx 安装完成"
}

install_pm2() {
    if command -v pm2 &> /dev/null; then
        log_info "PM2 已安装"
        return
    fi
    log_step "安装 PM2"
    npm install -g pm2
    log_info "PM2 安装完成"
}

setup_project() {
    log_step "部署项目"

    # 如果当前就在目标目录，直接就地部署
    if [ "$SCRIPT_DIR" = "$APP_DIR" ]; then
        log_info "当前已在项目目录，就地部署..."
        rm -rf "$APP_DIR/node_modules" "$APP_DIR/.git"
        cd "$APP_DIR"
        install_deps_and_build
        return
    fi

    if [ -d "$APP_DIR" ]; then
        log_warn "项目目录已存在: $APP_DIR"
        read -p "是否覆盖? [y/N]: " choice
        if [[ "$choice" =~ ^[Yy]$ ]]; then
            pm2 stop $APP_NAME 2>/dev/null || true
            pm2 delete $APP_NAME 2>/dev/null || true
            rm -rf "$APP_DIR"
        else
            log_info "跳过部署"
            return
        fi
    fi

    mkdir -p "$APP_DIR"

    # 从脚本目录复制
    if [ -f "$SCRIPT_DIR/package.json" ] && [ -f "$SCRIPT_DIR/server.js" ]; then
        log_info "复制项目文件..."
        cp -r "$SCRIPT_DIR"/* "$APP_DIR/" 2>/dev/null || true
        cp -r "$SCRIPT_DIR"/.* "$APP_DIR/" 2>/dev/null || true
    else
        log_error "未找到项目文件（package.json, server.js）"
        ls -la "$SCRIPT_DIR"
        exit 1
    fi

    cd "$APP_DIR"
    rm -rf "$APP_DIR/node_modules" "$APP_DIR/.git"
    install_deps_and_build
}

install_deps_and_build() {
    log_info "安装依赖..."
    npm install --registry https://registry.npmmirror.com

    if [ -d "dist" ] && [ -f "dist/index.html" ]; then
        log_info "已存在 dist，跳过构建"
    else
        log_info "构建前端..."
        npm run build
    fi

    if [ ! -d "dist" ]; then
        log_error "构建失败"
        exit 1
    fi

    log_info "项目部署完成"
}

configure_nginx() {
    log_step "配置 Nginx"

    cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name _;

    client_max_body_size 1m;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|m4a|woff|woff2)$ {
        root ${APP_DIR}/dist;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

    ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default

    if nginx -t 2>&1; then
        systemctl reload nginx
        log_info "Nginx 配置完成"
    else
        log_error "Nginx 配置有误"
    fi
}

configure_firewall() {
    log_step "配置防火墙"
    if command -v ufw &> /dev/null; then
        ufw allow 22/tcp 2>/dev/null || true
        ufw allow 80/tcp 2>/dev/null || true
        ufw allow 443/tcp 2>/dev/null || true
        log_info "防火墙规则已添加"
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-service=http 2>/dev/null || true
        firewall-cmd --reload 2>/dev/null || true
        log_info "防火墙规则已添加"
    fi
}

start_service() {
    log_step "启动服务"

    cd "$APP_DIR"

    # 设置管理密钥
    local ENV_FILE="$APP_DIR/.env"
    if [ ! -f "$ENV_FILE" ]; then
        read -p "设置运维管理密钥 (留空跳过): " admin_key
        echo "ADMIN_KEY=$admin_key" > "$ENV_FILE"
    fi

    pm2 delete $APP_NAME 2>/dev/null || true

    pm2 start server.js \
        --name $APP_NAME \
        --max-memory-restart 256M \
        --time

    pm2 save
    pm2 startup 2>/dev/null || true

    sleep 2

    if pm2 list | grep -q "$APP_NAME.*online"; then
        log_info "服务启动成功"
    else
        log_error "服务启动失败"
        pm2 logs $APP_NAME --lines 10
        exit 1
    fi
}

verify() {
    local ip=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  部署完成!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  访问: ${BLUE}http://${ip}${NC}"
    echo -e "  目录: ${APP_DIR}"
    echo ""
    echo -e "  运维接口:"
    echo -e "    健康检查: http://${ip}/api/ops/health"
    echo -e "    服务信息: http://${ip}/api/ops/info?key=密钥"
    echo ""
    echo -e "  常用命令:"
    echo -e "    查看日志: ${YELLOW}pm2 logs ${APP_NAME}${NC}"
    echo -e "    重启服务: ${YELLOW}pm2 restart ${APP_NAME}${NC}"
    echo ""
}

show_menu() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  峰峰跑酷 - 部署脚本${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "  1) 完整部署"
    echo "  2) 更新项目 (保留数据)"
    echo "  3) 重启服务"
    echo "  4) 查看状态"
    echo "  5) 查看日志"
    echo "  0) 退出"
    echo ""
    read -p "请选择 [0-5]: " choice

    case $choice in
        1) full_deploy ;;
        2) update_project ;;
        3) pm2 restart $APP_NAME && log_info "已重启" ;;
        4) pm2 list ;;
        5) pm2 logs $APP_NAME --lines 50 ;;
        0) exit 0 ;;
        *) log_error "无效选择"; show_menu ;;
    esac
}

full_deploy() {
    check_root
    check_os
    check_port
    install_node
    install_build_tools
    install_nginx
    install_pm2
    setup_project
    configure_nginx
    configure_firewall
    start_service
    verify
}

update_project() {
    check_root
    if [ ! -d "$APP_DIR" ]; then
        log_error "项目未安装"
        return
    fi

    cd "$APP_DIR"
    cp data.json /tmp/fengfeng-backup.json 2>/dev/null || true
    cp data.db /tmp/fengfeng-backup.db 2>/dev/null || true

    cp "$SCRIPT_DIR"/server.js "$APP_DIR/" 2>/dev/null || true
    cp "$SCRIPT_DIR"/db.js "$APP_DIR/" 2>/dev/null || true
    cp "$SCRIPT_DIR"/package*.json "$APP_DIR/" 2>/dev/null || true
    cp -r "$SCRIPT_DIR"/dist "$APP_DIR/" 2>/dev/null || true

    cp /tmp/fengfeng-backup.json "$APP_DIR/data.json" 2>/dev/null || true
    cp /tmp/fengfeng-backup.db "$APP_DIR/data.db" 2>/dev/null || true

    npm install --registry https://registry.npmmirror.com
    pm2 restart $APP_NAME
    log_info "更新完成"
}

if [ "$1" = "--auto" ]; then
    full_deploy
else
    show_menu
fi
