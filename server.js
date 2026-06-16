import express from 'express'
import path from 'path'
import cors from 'cors'
import os from 'os'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { saveScore, getLeaderboard, getStats, clearLeaderboard, close, init } from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000
const ADMIN_KEY = process.env.ADMIN_KEY || ''
const startTime = Date.now()

app.use(cors())
app.use(express.json({ limit: '1kb' }))
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache')
    }
  }
}))

function requireAdmin(req, res, next) {
  if (!ADMIN_KEY) return next()
  const key = req.query.key || req.headers['x-admin-key']
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ success: false, message: '未授权' })
  }
  next()
}

// ============ 游戏 API ============

app.post('/api/score', (req, res) => {
  try {
    const { score, username, browserId, coins, distance, difficulty, timestamp } = req.body

    if (!browserId || typeof score !== 'number') {
      return res.status(400).json({ success: false, message: '无效的数据' })
    }

    const sanitizedId = String(browserId).substring(0, 30).replace(/[<>]/g, '')
    const sanitizedUsername = String(username || '匿名玩家').substring(0, 12).replace(/[<>]/g, '')

    const result = saveScore({
      browserId: sanitizedId,
      username: sanitizedUsername,
      score: Math.floor(score),
      coins: coins || 0,
      distance: distance || 0,
      difficulty: difficulty || 'normal',
      timestamp: timestamp || Date.now()
    })

    res.json(result)
  } catch (error) {
    console.error('Score save error:', error)
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

app.get('/api/scores', (req, res) => {
  try {
    const scores = getLeaderboard()
    res.json({ success: true, scores })
  } catch (error) {
    console.error('Leaderboard error:', error)
    res.status(500).json({ success: false, scores: [] })
  }
})

// ============ 运维 API ============

app.get('/api/ops/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: Date.now()
  })
})

app.get('/api/ops/info', requireAdmin, (req, res) => {
  const mem = process.memoryUsage()
  const cpus = os.cpus()

  res.json({
    success: true,
    app: {
      name: 'fengfeng-runner',
      version: '3.1.0',
      port: PORT,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      startTime: new Date(startTime).toISOString()
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      cpus: cpus.length,
      cpuModel: cpus[0]?.model || 'unknown',
      totalMem: Math.floor(os.totalmem() / 1024 / 1024),
      freeMem: Math.floor(os.freemem() / 1024 / 1024),
      loadAvg: os.loadavg()
    },
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      heapUsed: Math.floor(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.floor(mem.heapTotal / 1024 / 1024),
      rss: Math.floor(mem.rss / 1024 / 1024)
    }
  })
})

app.get('/api/ops/stats', requireAdmin, (req, res) => {
  try {
    const stats = getStats()
    const dbPath = path.join(__dirname, 'data.json')
    let dbSize = 0
    try { dbSize = fs.statSync(dbPath).size } catch {}

    res.json({
      success: true,
      database: {
        totalRecords: stats.total,
        sizeBytes: dbSize,
        sizeKB: Math.floor(dbSize / 1024)
      }
    })
  } catch (error) {
    res.status(500).json({ success: false })
  }
})

app.get('/api/ops/leaderboard', requireAdmin, (req, res) => {
  try {
    const scores = getLeaderboard()
    res.json({
      success: true,
      count: scores.length,
      scores
    })
  } catch (error) {
    res.status(500).json({ success: false })
  }
})

app.delete('/api/ops/leaderboard', requireAdmin, (req, res) => {
  try {
    clearLeaderboard()
    res.json({ success: true, message: '排行榜已清空' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/ops/export', requireAdmin, (req, res) => {
  try {
    const scores = getLeaderboard()
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="fengfeng-backup-${Date.now()}.json"`)
    res.json({
      exportTime: new Date().toISOString(),
      version: '3.1.0',
      totalRecords: scores.length,
      scores
    })
  } catch (error) {
    res.status(500).json({ success: false })
  }
})

app.get('/api/ops/logs', requireAdmin, (req, res) => {
  const lines = parseInt(req.query.lines) || 50
  try {
    const logPath = path.join(__dirname, 'logs', 'combined.log')
    if (!fs.existsSync(logPath)) {
      return res.json({ success: true, logs: [], message: '暂无日志' })
    }
    const content = fs.readFileSync(logPath, 'utf-8')
    const logLines = content.trim().split('\n').slice(-lines)
    res.json({ success: true, logs: logLines })
  } catch (error) {
    res.json({ success: true, logs: [], message: '暂无日志' })
  }
})

// ============ 游戏页面 ============

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// ============ 启动服务 ============

await init()

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🏃 峰峰跑酷游戏已启动`)
  console.log(`  📍 http://0.0.0.0:${PORT}`)
  console.log(`  🔧 运维接口: http://0.0.0.0:${PORT}/api/ops/health`)
  if (ADMIN_KEY) {
    console.log(`  🔑 管理密钥已启用`)
  }
  console.log('')
})

process.on('SIGINT', () => { close(); server.close(); process.exit(0) })
process.on('SIGTERM', () => { close(); server.close(); process.exit(0) })
