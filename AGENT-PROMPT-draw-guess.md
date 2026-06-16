# 你画我猜 - 开发部署指南

## 一、服务器环境

### 硬件配置
- **厂商**: 阿里云 ECS
- **CPU**: 2 核
- **内存**: 2 GB
- **带宽**: 3 Mbps
- **操作系统**: Ubuntu (具体版本通过 `lsb_release -a` 查看)

### 已安装软件
| 软件 | 版本 | 说明 |
|------|------|------|
| Node.js | v18.20.8 | 已安装，路径 `/usr/bin/node` |
| npm | 随 Node.js | 已安装 |
| Nginx | 已安装 | 反向代理，监听 80 端口 |
| PM2 | 已安装 | 进程管理，全局安装 |
| build-essential | 已安装 | C++ 编译工具 |
| git | 已安装 | 版本控制 |

### 端口分配
| 端口 | 用途 | 状态 |
|------|------|------|
| 22 | SSH | 已占用 |
| 80 | Nginx | 已占用，反向代理入口 |
| 3000 | 峰峰跑酷游戏 | 已占用 |
| **4000** | **你画我猜（新项目）** | **可用** |

### Nginx 配置路径
- 站点配置目录: `/etc/nginx/sites-available/`
- 启用站点目录: `/etc/nginx/sites-enabled/`
- 默认配置已删除: `/etc/nginx/sites-enabled/default` 已移除

### 已有项目路径
```
/opt/fengfeng-runner/    # 峰峰跑酷游戏
```

### 域名配置
- 主域名: `linkbrain.top`
- 已有子域: `ff.linkbrain.top` → 峰峰跑酷
- 新项目可用子域: 自定义，如 `draw.linkbrain.top`

---

## 二、新项目要求

### 项目名称
你画我猜（Draw & Guess）

### 部署路径
```
/opt/draw-guess/
```

### 监听端口
```
4000
```

### 功能需求
1. **房间系统**: 创建/加入房间，每房间 2-8 人
2. **画板功能**: 实时画笔同步，支持颜色、粗细、橡皮擦
3. **猜词系统**: 轮流作画，其他人猜词，计分
4. **实时通信**: 画笔轨迹、玩家状态、聊天消息实时同步
5. **排行榜**: 记录玩家得分

### 技术约束
- **内存限制**: 总内存 2GB，Node.js 应用不得超过 200MB
- **带宽限制**: 3Mbps，需优化画笔数据传输
- **存储**: 使用 JSON 文件或 SQLite，禁止使用 Redis/MySQL（内存不够）
- **实时通信**: 必须使用 WebSocket（Socket.IO），Nginx 需特殊配置

---

## 三、Nginx 配置

### 配置文件路径
```
/etc/nginx/sites-available/draw-guess
```

### 配置内容
```nginx
server {
    listen 80;
    server_name draw.linkbrain.top;  # 替换为实际域名，或用 _ 允许 IP 访问

    # 文件上传限制
    client_max_body_size 2m;

    # WebSocket 超时设置
    proxy_connect_timeout 10s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
        root /opt/draw-guess/public;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # 主代理配置（支持 WebSocket）
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;

        # WebSocket 必需配置
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 真实 IP 传递
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.IO 长轮询支持
    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;
    }
}
```

### 启用命令
```bash
ln -sf /etc/nginx/sites-available/draw-guess /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 四、项目结构

```
/opt/draw-guess/
├── server.js              # 入口：Express + Socket.IO 服务端
├── package.json           # 依赖配置
├── data.json              # 数据存储（排行榜等）
├── public/                # 前端静态文件目录
│   ├── index.html         # 主页面
│   ├── style.css          # 样式
│   ├── app.js             # 前端主逻辑 + Socket.IO 客户端
│   └── draw.js            # Canvas 画板逻辑
└── deploy.sh              # 部署脚本（可选）
```

---

## 五、依赖安装

```bash
mkdir -p /opt/draw-guess
cd /opt/draw-guess
npm init -y
npm install express socket.io cors
```

**禁止安装的包**（内存不够）:
- `redis` / `ioredis`
- `mysql` / `mysql2`
- `mongoose` / `mongodb`
- `sequelize`

**推荐使用的包**:
- `express` - HTTP 服务
- `socket.io` - WebSocket 实时通信
- `cors` - 跨域支持
- `better-sqlite3` - SQLite（如需结构化存储，Linux 下可正常编译）

---

## 六、server.js 模板

```javascript
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = createServer(app)
const io = new Server(server, {
    cors: { origin: '*' },
    pingTimeout: 60000,
    pingInterval: 25000
})

const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

// 房间数据（内存存储）
const rooms = new Map()

// Socket.IO 事件处理
io.on('connection', (socket) => {
    console.log(`玩家连接: ${socket.id}`)

    // 加入房间
    socket.on('join-room', (roomId, playerName) => {
        // ... 房间逻辑
    })

    // 画笔数据广播
    socket.on('draw', (data) => {
        socket.to(data.roomId).emit('draw', data)
    })

    // 猜词
    socket.on('guess', (roomId, word) => {
        // ... 猜词逻辑
    })

    // 断开连接
    socket.on('disconnect', () => {
        console.log(`玩家断开: ${socket.id}`)
        // ... 清理逻辑
    })
})

// API 接口
app.get('/api/rooms', (req, res) => {
    // 返回房间列表
})

// 启动服务
server.listen(PORT, '0.0.0.0', () => {
    console.log(`你画我猜服务已启动: http://0.0.0.0:${PORT}`)
})
```

**注意**: `package.json` 中必须添加 `"type": "module"` 以支持 ES Module 语法。

---

## 七、PM2 启动配置

```bash
cd /opt/draw-guess

# 启动（限制内存）
pm2 start server.js \
    --name draw-guess \
    --max-memory-restart 200M \
    --time

# 保存并设置开机自启
pm2 save
pm2 startup
```

### 常用命令
```bash
pm2 status              # 查看状态
pm2 logs draw-guess     # 查看日志
pm2 restart draw-guess  # 重启
pm2 stop draw-guess     # 停止
pm2 delete draw-guess   # 删除
pm2 monit               # 实时监控
```

---

## 八、安全组配置

在阿里云 ECS 控制台 → 安全组 → 入方向添加：

| 授权策略 | 协议 | 端口 | 来源 | 说明 |
|---------|------|------|------|------|
| 允许 | TCP | 4000 | 0.0.0.0/0 | 你画我猜（可选，仅调试用） |

**注意**: 正式环境通过 Nginx 80 端口访问，无需开放 4000。

---

## 九、部署流程

```bash
# 1. 创建项目目录
mkdir -p /opt/draw-guess
cd /opt/draw-guess

# 2. 初始化并安装依赖
npm init -y
# 修改 package.json 添加 "type": "module"
npm install express socket.io cors

# 3. 创建代码文件
# server.js, public/index.html, public/style.css, public/app.js, public/draw.js

# 4. 启动服务
pm2 start server.js --name draw-guess --max-memory-restart 200M --time
pm2 save

# 5. 配置 Nginx
cat > /etc/nginx/sites-available/draw-guess << 'EOF'
server {
    listen 80;
    server_name draw.linkbrain.top;

    client_max_body_size 2m;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

ln -sf /etc/nginx/sites-available/draw-guess /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 6. 测试访问
curl http://localhost:4000
```

---

## 十、运维接口规范

建议提供以下运维接口：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查，返回 `{ status: "ok", uptime: N }` |
| `/api/rooms` | GET | 当前房间列表 |
| `/api/stats` | GET | 统计数据（在线人数、房间数） |

---

## 十一、注意事项

1. **内存**: 2GB 总内存，Node.js 应用控制在 200MB 以内
2. **WebSocket**: Nginx 必须配置 `Upgrade` 和 `Connection` 头
3. **带宽**: 3Mbps 约支持 50-100 人同时在线，画笔数据需压缩
4. **数据持久化**: 房间数据可存内存（重启丢失），排行榜存文件
5. **超时设置**: WebSocket 连接需要较长的超时时间
6. **断线重连**: 客户端需实现自动重连机制
7. **并发安全**: 多人同时操作房间时注意竞态条件
