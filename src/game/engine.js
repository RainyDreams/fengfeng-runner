import { CONFIG } from './config.js'
import { getImage } from './images.js'

const FIXED_DT = 1000 / 60
const MAX_ACCUM = FIXED_DT * 3
const SPEED_LERP = 0.04

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false })
    this.running = false
    this.paused = false
    this._raf = null
    this._accumulator = 0
    this._lastTime = 0
    this._targetSpeed = CONFIG.baseSpeed
    this._onScoreChange = null
    this._onGameOver = null
    this._onCoinsChange = null
    this._onComboChange = null
    this._onLivesChange = null
    this._onStateSync = null

    this.gameState = {
      score: 0,
      speed: CONFIG.baseSpeed,
      combo: 0,
      comboTimer: 0,
      coins: 0,
      lives: 1,
      distance: 0,
      startTime: 0,
      lastObstacleTime: 0,
      frameCount: 0,
      fpsTimer: 0,
      fps: 60,
      difficulty: 'normal'
    }

    this.player = {
      x: 80, y: 0, width: 50, height: 70,
      jumping: false, jumpForce: 0, grounded: true,
      jumpCount: 0, maxJumps: 2,
      invincible: false, invincibleTimer: 0,
      trail: [], animFrame: 0
    }

    this.ground = { y: 0, height: 20 }
    this.obstacles = []
    this.questionBlocks = []
    this.coins = []
    this.particles = []
    this.floatingTexts = []

    this.bg = { time: 0, clouds: [], stars: [], buildings: [] }

    this._onKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault()
        this.jump()
      }
    }

    this._onDocTouch = (e) => {
      if (!this.running) return
      const tag = e.target?.tagName
      if (tag === 'BUTTON' || tag === 'INPUT') return
      e.preventDefault()
      this.jump()
    }

    this._onCanvasClick = () => { this.jump() }

    document.addEventListener('keydown', this._onKeyDown)
    document.addEventListener('touchstart', this._onDocTouch, { passive: false })
    canvas.addEventListener('click', this._onCanvasClick)
  }

  onScoreChange(fn) { this._onScoreChange = fn }
  onGameOver(fn) { this._onGameOver = fn }
  onCoinsChange(fn) { this._onCoinsChange = fn }
  onComboChange(fn) { this._onComboChange = fn }
  onLivesChange(fn) { this._onLivesChange = fn }
  onStateSync(fn) { this._onStateSync = fn }

  initCanvas() {
    const container = this.canvas.parentElement
    const header = container?.querySelector('.game-header')
    const h = header ? header.offsetHeight : 56
    const w = container ? container.clientWidth : window.innerWidth
    const isMobile = w <= 768
    this.ground.height = isMobile ? 80 : 20
    const ch = window.innerHeight - h

    const dpr = CONFIG.dpr
    this.canvas.width = w * dpr
    this.canvas.height = ch * dpr
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = ch + 'px'

    const ctx = this.ctx
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    this.ground.y = ch - this.ground.height
    this.player.y = this.ground.y - this.player.height

    if (isMobile) {
      this.player.width = 44
      this.player.height = 60
    }

    this._initBg(w, ch)
  }

  start(difficulty = 'normal') {
    this.stop()
    const diff = CONFIG.difficulties[difficulty] || CONFIG.difficulties.normal

    this._targetSpeed = CONFIG.baseSpeed * diff.speedMult
    this._accumulator = 0

    this.gameState = {
      score: 0, speed: CONFIG.baseSpeed * diff.speedMult,
      combo: 0, comboTimer: 0, coins: 0, lives: 1, distance: 0,
      startTime: Date.now(), lastObstacleTime: Date.now() + 1500,
      lastQuestionBlockTime: Date.now() + 3000,
      frameCount: 0, fpsTimer: 0, fps: 60,
      difficulty
    }

    this.obstacles = []
    this.questionBlocks = []
    this.coins = []
    this.particles = []
    this.floatingTexts = []

    this.player.y = this.ground.y - this.player.height
    this.player.jumping = false
    this.player.grounded = true
    this.player.jumpForce = 0
    this.player.jumpCount = 0
    this.player.invincible = false
    this.player.trail = []

    this.running = true
    this._lastTime = performance.now()
    this._syncState()
    this._raf = requestAnimationFrame((t) => this._loop(t))
  }

  stop() {
    this.running = false
    this.paused = false
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null }
  }

  pause() {
    if (!this.running || this.paused) return
    this.paused = true
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null }
    this._syncState()
  }

  resume() {
    if (!this.paused) return
    this.paused = false
    this._lastTime = performance.now()
    this._raf = requestAnimationFrame((t) => this._loop(t))
  }

  jump() {
    if (!this.running) return
    const p = this.player
    if (p.jumpCount >= p.maxJumps) return

    p.jumping = true
    p.grounded = false
    p.jumpForce = p.jumpCount === 0 ? CONFIG.jumpForce : CONFIG.doubleJumpForce
    p.jumpCount++
    this._createParticle(p.x + p.width / 2, p.y + p.height, 4, '#ffffff')
  }

  quit() {
    if (!this.running) return
    this._gameOver()
  }

  destroy() {
    this.stop()
    document.removeEventListener('keydown', this._onKeyDown)
    document.removeEventListener('touchstart', this._onDocTouch)
    this.canvas.removeEventListener('click', this._onCanvasClick)
  }

  _syncState() {
    this._onStateSync?.({
      score: this.gameState.score,
      coins: this.gameState.coins,
      combo: this.gameState.combo,
      speed: this.gameState.speed,
      distance: this.gameState.distance,
      lives: this.gameState.lives,
      running: this.running,
      paused: this.paused
    })
  }

  _loop(ts) {
    if (!this.running) return

    let rawDt = ts - this._lastTime
    this._lastTime = ts

    if (rawDt > MAX_ACCUM) rawDt = MAX_ACCUM
    this._accumulator += rawDt

    while (this._accumulator >= FIXED_DT) {
      this._fixedUpdate()
      this._accumulator -= FIXED_DT
    }

    this._draw()
    this._raf = requestAnimationFrame((t) => this._loop(t))
  }

  _fixedUpdate() {
    const gs = this.gameState
    const p = this.player
    const dtFactor = FIXED_DT / 1000 * 60

    gs.frameCount++
    gs.fpsTimer += FIXED_DT
    if (gs.fpsTimer >= 1000) { gs.fps = gs.frameCount; gs.frameCount = 0; gs.fpsTimer = 0 }

    this._updateTargetSpeed()
    gs.speed += (this._targetSpeed - gs.speed) * SPEED_LERP

    this.bg.time += FIXED_DT

    p.jumpForce += CONFIG.gravity * dtFactor
    p.y += p.jumpForce * dtFactor

    if (p.y >= this.ground.y - p.height) {
      p.y = this.ground.y - p.height
      p.jumping = false
      p.grounded = true
      p.jumpForce = 0
      p.jumpCount = 0
    }
    if (p.y < 0) { p.y = 0; p.jumpForce = 0 }

    if (p.invincible) {
      p.invincibleTimer -= FIXED_DT
      if (p.invincibleTimer <= 0) p.invincible = false
    }

    gs.distance += gs.speed * 0.08 * dtFactor

    if (gs.combo > 0) {
      gs.comboTimer -= FIXED_DT
      if (gs.comboTimer <= 0) { gs.combo = 0; this._onComboChange?.(0) }
    }

    this._createObstacle()
    this._createQuestionBlock()
    this._createCoin()

    const diff = CONFIG.difficulties[gs.difficulty]
    const moveAmount = gs.speed * dtFactor

    this.bg.grassOff = ((this.bg.grassOff || 0) + moveAmount) % 16
    const cw = this.canvas.width / CONFIG.dpr
    this.bg.buildOff = ((this.bg.buildOff || 0) + moveAmount) % (cw + 80)

    this.questionBlocks = this.questionBlocks.filter(qb => {
      qb.x -= moveAmount
      qb.bounceAnim = (qb.bounceAnim || 0) + 0.06 * dtFactor

      if (!qb.hit && this._checkQuestionBlockHit(qb)) {
        qb.hit = true
        qb.hitAnim = 0
        this._applyPowerUp(qb.x + qb.width / 2, qb.y, qb.powerUp)
      }

      if (qb.hit) {
        qb.hitAnim = (qb.hitAnim || 0) + 0.1 * dtFactor
      }

      return qb.x > -80
    })

    this.obstacles = this.obstacles.filter(ob => {
      ob.x -= moveAmount
      if (ob.x + ob.width < p.x && !ob.passed) {
        ob.passed = true
        gs.score += Math.floor(ob.points * diff.scoreMult)
        gs.combo++
        gs.comboTimer = CONFIG.comboTimeout
        this._onScoreChange?.(gs.score)
        this._onComboChange?.(gs.combo)
        if (gs.combo > 1) {
          this._floatingText(p.x + p.width / 2, p.y - 15, `${gs.combo}x 连击!`)
        }
      }
      if (p.invincible && this._checkCollision(ob)) {
        ob.knocked = true
        ob.knockVx = 8 + Math.random() * 4
        ob.knockVy = -(8 + Math.random() * 5)
        ob.knockRot = (Math.random() - 0.5) * 0.3
        ob.knockLife = 40
        gs.score += 5
        this._onScoreChange?.(gs.score)
        this._createParticle(ob.x + ob.width / 2, ob.y + ob.height / 2, 6, '#FFD700')
        this._floatingText(ob.x + ob.width / 2, ob.y, '+5 弹飞!', '#FFD700')
      }
      if (!p.invincible && this._checkCollision(ob)) {
        gs.lives--
        this._onLivesChange?.(gs.lives)
        if (gs.lives <= 0) {
          this._gameOver()
          return false
        }
        p.invincible = true
        p.invincibleTimer = 2000
        this._createParticle(p.x + p.width / 2, p.y + p.height / 2, 10, '#ff4444')
        this._floatingText(p.x + p.width / 2, p.y - 20, '受伤!', '#ff4444')
      }
      return ob.x > -80 && (!ob.knocked || ob.knockLife > 0)
    })

    this.obstacles.forEach(ob => {
      if (ob.knocked) {
        ob.x += ob.knockVx * dtFactor
        ob.y += ob.knockVy * dtFactor
        ob.knockVy += 0.5 * dtFactor
        ob.knockLife -= dtFactor
      }
    })

    this.coins = this.coins.filter(c => {
      c.x -= moveAmount
      c.anim += 0.04 * dtFactor
      c.y += Math.sin(c.anim) * 0.4
      if (!c.collected && this._checkCoin(c)) {
        c.collected = true
        gs.coins++
        gs.score += 5
        this._onScoreChange?.(gs.score)
        this._onCoinsChange?.(gs.coins)
        this._createParticle(c.x, c.y, 6, '#FFD700')
        this._floatingText(c.x, c.y - 15, '+5')
        if (gs.combo >= 5) {
          const bonus = gs.combo * 2
          gs.score += bonus
          this._onScoreChange?.(gs.score)
          this._floatingText(c.x, c.y - 35, `连击奖励 +${bonus}`, '#FF6B6B')
        }
        return false
      }
      return c.x > -40 && !c.collected
    })

    this._updateParticles(dtFactor)
    this._updateFloatingTexts(dtFactor)
    this._syncState()
  }

  _updateTargetSpeed() {
    const gs = this.gameState
    const diff = CONFIG.difficulties[gs.difficulty]
    const elapsed = (Date.now() - gs.startTime) / 1000
    const timeBonus = Math.min(elapsed / 50, 1.5)
    const distBonus = Math.floor(gs.distance / 250) * 0.2
    const comboBonus = Math.min(gs.combo * 0.08, 0.8)
    this._targetSpeed = (CONFIG.baseSpeed + timeBonus + distBonus + comboBonus) * diff.speedMult
    this._targetSpeed = Math.min(this._targetSpeed, CONFIG.maxSpeed * diff.speedMult)
  }

  _draw() {
    const w = this.canvas.width / CONFIG.dpr
    const h = this.canvas.height / CONFIG.dpr
    const ctx = this.ctx

    ctx.clearRect(0, 0, w, h)
    this._drawBg(w, h)
    this.questionBlocks.forEach(qb => this._drawQuestionBlock(qb))
    this.coins.forEach(c => this._drawCoin(c))
    this.obstacles.forEach(o => this._drawObstacle(o))
    this._drawPlayer()
    this._drawParticles()
    this._drawFloatingTexts()
    this._drawHUD(w, h)
  }

  _initBg(w, h) {
    this.bg.clouds = Array.from({ length: 6 }, () => ({
      x: Math.random() * w * 1.5, y: Math.random() * h * 0.25 + 15,
      size: Math.random() * 50 + 35, speed: Math.random() * 0.2 + 0.08,
      opacity: Math.random() * 0.3 + 0.15
    }))
    this.bg.buildings = Array.from({ length: 10 }, (_, i) => ({
      x: i * (w / 5) + Math.random() * 40,
      width: Math.random() * 35 + 25, height: Math.random() * 70 + 50,
      color: `hsl(${220 + Math.random() * 20}, ${8 + Math.random() * 8}%, ${22 + Math.random() * 8}%)`
    }))
    this.bg.stars = Array.from({ length: 15 }, () => ({
      x: Math.random() * w, y: Math.random() * h * 0.35,
      size: Math.random() * 1.5 + 0.5, twinkle: Math.random() * Math.PI * 2
    }))
  }

  _drawBg(w, h) {
    const ctx = this.ctx
    const t = this.bg.time
    const gs = this.gameState
    const dtFactor = FIXED_DT / 1000 * 60

    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7)
    sky.addColorStop(0, '#0a0a12')
    sky.addColorStop(0.5, '#1a1a2e')
    sky.addColorStop(1, '#16213e')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = '#ffffff'
    this.bg.stars.forEach(s => {
      ctx.globalAlpha = Math.sin(t * 0.0015 + s.twinkle) * 0.2 + 0.4
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1

    this.bg.buildings.forEach(b => {
      const bx = ((b.x - this.bg.buildOff) % (w + 80) + w + 80) % (w + 80) - 40
      ctx.fillStyle = b.color
      ctx.fillRect(bx, this.ground.y - b.height - 25, b.width, b.height + 25)
      ctx.fillStyle = 'rgba(255,200,100,0.2)'
      for (let wy = this.ground.y - b.height - 15; wy < this.ground.y - 35; wy += 12)
        for (let wx = bx + 4; wx < bx + b.width - 4; wx += 10)
          if (Math.random() > 0.5) ctx.fillRect(wx, wy, 5, 6)
    })

    this.bg.clouds.forEach(c => {
      c.x -= c.speed * gs.speed * 0.25 * (FIXED_DT / 1000 * 60)
      if (c.x + c.size < 0) {
        c.x = w + c.size
        c.y = Math.random() * h * 0.25 + 15
      }
      ctx.fillStyle = `rgba(255,255,255,${c.opacity})`
      ctx.beginPath()
      ctx.arc(c.x, c.y, c.size * 0.35, 0, Math.PI * 2)
      ctx.arc(c.x + c.size * 0.25, c.y - c.size * 0.08, c.size * 0.3, 0, Math.PI * 2)
      ctx.arc(c.x + c.size * 0.5, c.y, c.size * 0.25, 0, Math.PI * 2)
      ctx.fill()
    })

    ctx.fillStyle = '#1a3a18'
    ctx.fillRect(0, this.ground.y, w, this.ground.height)

    const off = this.bg.grassOff || 0
    ctx.fillStyle = '#2a5a24'
    for (let i = -16; i < w + 16; i += 16) {
      const gx = i - off
      ctx.beginPath()
      ctx.moveTo(gx, this.ground.y)
      ctx.lineTo(gx + 8, this.ground.y - 5)
      ctx.lineTo(gx + 16, this.ground.y)
      ctx.fill()
    }
  }

  _drawPlayer() {
    const ctx = this.ctx
    const p = this.player
    const { x, y, width: w, height: h } = p

    if (p.jumping || this.gameState.speed > 7) {
      p.trail.unshift({ x, y, alpha: 0.4 })
      if (p.trail.length > 3) p.trail.pop()
    } else {
      p.trail = []
    }

    p.trail.forEach((t, i) => {
      ctx.globalAlpha = t.alpha * (1 - i / 3) * 0.2
      ctx.fillStyle = '#FFD700'
      this._roundRect(t.x + 2, t.y + 2, w - 4, h - 4, 8)
      ctx.fill()
    })
    ctx.globalAlpha = 1

    if (p.invincible && Math.floor(Date.now() / 100) % 2 === 0) ctx.globalAlpha = 0.6

    ctx.save()
    if (p.jumping) {
      const cx = x + w / 2, cy = y + h / 2
      ctx.translate(cx, cy)
      ctx.rotate(p.jumpForce > 0 ? 0.06 : -0.06)
      ctx.translate(-cx, -cy)
    }

    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.beginPath()
    ctx.ellipse(x + w / 2, this.ground.y + 3, w / 2 - 4, 4, 0, 0, Math.PI * 2)
    ctx.fill()

    const r = 10
    ctx.beginPath()
    this._roundRect(x, y, w, h, r)
    ctx.clip()

    const img = getImage('player')
    if (img) {
      const imgR = img.width / img.height
      const pR = w / h
      let dx, dy, dw, dh
      if (imgR > pR) { dh = h; dw = h * imgR; dx = x - (dw - w) / 2; dy = y }
      else { dw = w; dh = w / imgR; dx = x; dy = y - (dh - h) / 2 }
      ctx.drawImage(img, dx, dy, dw, dh)
    } else {
      ctx.fillStyle = '#e74c3c'
      ctx.fillRect(x, y, w, h)
    }
    ctx.restore()

    const glow = Math.sin(Date.now() / 400) * 0.2 + 0.8
    ctx.strokeStyle = p.invincible ? '#00ff88' : '#FFD700'
    ctx.lineWidth = 2
    ctx.globalAlpha = glow
    ctx.beginPath()
    this._roundRect(x, y, w, h, r)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  _drawObstacle(ob) {
    const ctx = this.ctx
    const img = getImage(ob.imageKey)
    const x = ob.x, w = ob.width, h = ob.height
    const y = ob.knocked ? ob.y : this.ground.y - h

    if (ob.knocked) {
      ctx.save()
      ctx.globalAlpha = Math.max(0, ob.knockLife / 40)
      ctx.translate(x + w / 2, y + h / 2)
      ctx.rotate((ob.knockLife - 40) * ob.knockRot)
      ctx.translate(-(x + w / 2), -(y + h / 2))
    }

    if (!ob.knocked) {
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      ctx.beginPath()
      ctx.ellipse(x + w / 2, this.ground.y + 2, w / 2, 3, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    if (img) ctx.drawImage(img, x, y, w, h)
    else { ctx.fillStyle = '#8b4513'; ctx.fillRect(x, y, w, h) }

    if (ob.knocked) {
      ctx.restore()
    }
  }

  _drawCoin(c) {
    const ctx = this.ctx
    const { x, y } = c
    const size = CONFIG.coinSize
    const t = Date.now() / 250

    ctx.fillStyle = 'rgba(255,215,0,0.15)'
    ctx.beginPath()
    ctx.arc(x, y, size * 0.7 + Math.sin(t) * 2, 0, Math.PI * 2)
    ctx.fill()

    const g = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, size / 2)
    g.addColorStop(0, '#FFE55C'); g.addColorStop(0.6, '#FFD700'); g.addColorStop(1, '#DAA520')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#B8860B'
    ctx.font = `bold ${size * 0.5}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('$', x, y)

    ctx.strokeStyle = 'rgba(255,215,0,0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    ctx.stroke()
  }

  _drawParticles() {
    const ctx = this.ctx
    this.particles.forEach(p => {
      ctx.globalAlpha = p.life / p.maxLife
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1
  }

  _drawFloatingTexts() {
    const ctx = this.ctx
    this.floatingTexts.forEach(t => {
      ctx.globalAlpha = t.life / 50
      ctx.fillStyle = t.color
      ctx.font = 'bold 14px -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(t.text, t.x, t.y)
    })
    ctx.globalAlpha = 1
  }

  _drawHUD(w) {
    const ctx = this.ctx
    const gs = this.gameState

    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.beginPath()
    this._roundRect(8, 8, 140, 90, 8)
    ctx.fill()

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 18px -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`${gs.score}`, 18, 34)

    ctx.font = '10px -apple-system, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillText(`速度 ${gs.speed.toFixed(1)}x · ${gs.coins}币`, 18, 52)
    ctx.fillText(`${CONFIG.difficulties[gs.difficulty].label}模式`, 18, 68)

    ctx.font = '14px -apple-system, sans-serif'
    ctx.textAlign = 'left'
    let hx = 18
    for (let i = 0; i < gs.lives; i++) {
      ctx.fillStyle = '#ff4444'
      ctx.fillText('❤', hx, 85)
      hx += 18
    }

    if (gs.combo > 1) {
      ctx.fillStyle = '#FFD700'
      ctx.font = 'bold 14px -apple-system, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(`${gs.combo}x 连击`, w - 16, 34)
    }

    const p = this.player
    if (p.invincible && p.invincibleTimer > 0 && p.invincibleTimer <= 3000) {
      const sec = Math.ceil(p.invincibleTimer / 1000)
      const alpha = 0.5 + Math.sin(Date.now() / 100) * 0.5
      ctx.globalAlpha = alpha
      ctx.fillStyle = '#00ff88'
      ctx.font = 'bold 28px -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`🛡 ${sec}s`, w / 2, 50)
      ctx.globalAlpha = 1
    }
  }

  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  _createObstacle() {
    const gs = this.gameState
    const now = Date.now()
    const diff = CONFIG.difficulties[gs.difficulty]
    const minInterval = Math.max(600, 1400 - gs.distance * 0.4) / diff.obstacleMult
    if (now - gs.lastObstacleTime < minInterval) return

    const pool = CONFIG.obstacles[gs.difficulty] || CONFIG.obstacles.normal
    const t = pool[Math.floor(Math.random() * pool.length)]
    const cw = this.canvas.width / CONFIG.dpr
    this.obstacles.push({ x: cw + 40, y: this.ground.y - t.height, width: CONFIG.obstacleWidth, height: t.height, imageKey: t.imageKey, points: t.points, passed: false })
    gs.lastObstacleTime = now
  }

  _createQuestionBlock() {
    const gs = this.gameState
    const now = Date.now()
    const diff = CONFIG.difficulties[gs.difficulty]
    const baseInterval = gs.difficulty === 'easy' ? 10000 : gs.difficulty === 'normal' ? 8000 : 6000
    const minInterval = Math.max(baseInterval * 0.6, baseInterval - gs.distance * 0.3)
    if (now - gs.lastQuestionBlockTime < minInterval) return
    if (this.questionBlocks.length >= 2) return

    const pool = CONFIG.questionBlocks
    const t = pool[Math.floor(Math.random() * pool.length)]
    const powerUp = CONFIG.powerUps[Math.floor(Math.random() * CONFIG.powerUps.length)]
    const cw = this.canvas.width / CONFIG.dpr
    const floatY = this.ground.y - CONFIG.questionBlockFloatY

    this.questionBlocks.push({
      x: cw + 40,
      y: floatY,
      width: CONFIG.questionBlockWidth,
      height: t.height,
      imageKey: t.imageKey,
      powerUp,
      hit: false,
      hitAnim: 0,
      bounceAnim: 0
    })
    gs.lastQuestionBlockTime = now
  }

  _checkQuestionBlockHit(qb) {
    const p = this.player
    const px = p.x, py = p.y, pw = p.width, ph = p.height
    const qx = qb.x, qy = qb.y, qw = qb.width, qh = qb.height

    return px < qx + qw && px + pw > qx && py < qy + qh && py + ph > qy
  }

  _applyPowerUp(x, y, powerUp) {
    const gs = this.gameState
    const p = this.player

    switch (powerUp.type) {
      case 'life':
        gs.lives++
        this._onLivesChange?.(gs.lives)
        this._createParticle(x, y, 12, powerUp.color)
        this._floatingText(x, y - 20, powerUp.label, powerUp.color)
        break
      case 'coins':
        gs.coins += 50
        gs.score += 50
        this._onCoinsChange?.(gs.coins)
        this._onScoreChange?.(gs.score)
        this._createParticle(x, y, 12, powerUp.color)
        this._floatingText(x, y - 20, powerUp.label, powerUp.color)
        break
      case 'shield':
        p.invincible = true
        p.invincibleTimer = 5000
        this._createParticle(x, y, 12, powerUp.color)
        this._floatingText(x, y - 20, powerUp.label, powerUp.color)
        break
      case 'score':
        gs.score += 100
        this._onScoreChange?.(gs.score)
        this._createParticle(x, y, 12, powerUp.color)
        this._floatingText(x, y - 20, powerUp.label, powerUp.color)
        break
    }
  }

  _drawQuestionBlock(qb) {
    const ctx = this.ctx
    const img = getImage(qb.imageKey)
    const x = qb.x, y = qb.y, w = qb.width, h = qb.height
    const bounce = Math.sin(qb.bounceAnim) * 3
    const pu = qb.powerUp

    if (qb.hit) {
      ctx.globalAlpha = Math.max(0, 1 - qb.hitAnim)
      const shift = qb.hitAnim * 15
      ctx.save()
      ctx.translate(x + w / 2, y + h / 2 + shift)
      ctx.scale(1 + qb.hitAnim * 0.2, 1 - qb.hitAnim * 0.3)
      ctx.translate(-(x + w / 2), -(y + h / 2))
    }

    const glow = 0.5 + Math.sin(qb.bounceAnim * 2) * 0.3
    ctx.fillStyle = pu.color.replace(')', `, ${glow * 0.12})`).replace('rgb', 'rgba').replace('#', '')
    const hexToRgba = (hex, a) => {
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
      return `rgba(${r},${g},${b},${a})`
    }
    ctx.fillStyle = hexToRgba(pu.color, glow * 0.15)
    ctx.beginPath()
    ctx.arc(x + w / 2, y + h / 2 + bounce, w * 0.7, 0, Math.PI * 2)
    ctx.fill()

    if (img) {
      ctx.drawImage(img, x, y + bounce, w, h)
    } else {
      ctx.fillStyle = pu.color
      this._roundRect(x, y + bounce, w, h, 6)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = `bold ${w * 0.5}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('?', x + w / 2, y + h / 2 + bounce)
    }

    if (!qb.hit) {
      ctx.strokeStyle = hexToRgba(pu.color, glow * 0.8)
      ctx.lineWidth = 2
      this._roundRect(x, y + bounce, w, h, 6)
      ctx.stroke()

      ctx.fillStyle = hexToRgba(pu.color, 0.9)
      ctx.font = 'bold 11px -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      const labelText = `${pu.icon} ${pu.label}`
      const labelW = ctx.measureText(labelText).width + 12
      ctx.fillStyle = hexToRgba(pu.color, 0.2)
      this._roundRect(x + w / 2 - labelW / 2, y - 22 + bounce, labelW, 18, 4)
      ctx.fill()
      ctx.fillStyle = pu.color
      ctx.fillText(labelText, x + w / 2, y - 6 + bounce)
    }

    if (qb.hit) {
      ctx.restore()
      ctx.globalAlpha = 1
    }
  }

  _createCoin() {
    if (Math.random() > 0.025 || this.coins.length >= 4) return
    const cw = this.canvas.width / CONFIG.dpr
    const patterns = [
      [{ x: cw + 40, y: this.ground.y - 70 }],
      Array.from({ length: 3 }, (_, i) => ({ x: cw + 40 + i * 30, y: this.ground.y - 70 })),
      Array.from({ length: 4 }, (_, i) => ({
        x: cw + 40 + i * 28,
        y: this.ground.y - 70 - Math.sin(i / 3 * Math.PI) * 40
      }))
    ]
    patterns[Math.floor(Math.random() * patterns.length)].forEach(p => {
      this.coins.push({ x: p.x, y: p.y, collected: false, anim: Math.random() * Math.PI * 2 })
    })
  }

  _checkCollision(ob) {
    const p = this.player
    const px = p.x + 5, py = p.y + 3, pw = p.width - 10, ph = p.height - 6
    const ox = ob.x + 2, oy = this.ground.y - ob.height + 2, ow = ob.width - 4, oh = ob.height - 4
    return px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy
  }

  _checkCoin(c) {
    const p = this.player
    const dx = (p.x + p.width / 2) - c.x
    const dy = (p.y + p.height / 2) - c.y
    return Math.sqrt(dx * dx + dy * dy) < CONFIG.coinSize + 18
  }

  _createParticle(x, y, count = 6, color = null) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= CONFIG.particleLimit) break
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 1) * 6,
        life: 25 + Math.random() * 15, maxLife: 40,
        color: color || `hsl(${Math.random() * 60 + 30}, 100%, 55%)`,
        size: Math.random() * 3 + 1.5
      })
    }
  }

  _floatingText(x, y, text, color = '#FFD700') {
    this.floatingTexts.push({ x, y, text, color, life: 50, vy: -1.5 })
  }

  _updateParticles(dtFactor) {
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dtFactor
      p.y += p.vy * dtFactor
      p.vy += 0.15 * dtFactor
      p.life -= dtFactor
      return p.life > 0
    })
  }

  _updateFloatingTexts(dtFactor) {
    this.floatingTexts = this.floatingTexts.filter(t => {
      t.y += t.vy * dtFactor
      t.life -= dtFactor
      return t.life > 0
    })
  }

  _gameOver() {
    this.running = false
    const gs = this.gameState
    const p = this.player

    this._createParticle(p.x + p.width / 2, p.y + p.height / 2, 15)

    const achievements = []
    if (gs.score >= 100) achievements.push('百分达人')
    if (gs.score >= 500) achievements.push('跑酷高手')
    if (gs.coins >= 20) achievements.push('金币猎人')
    if (gs.combo >= 10) achievements.push('连击之王')

    this._syncState()
    this._onGameOver?.({
      score: gs.score,
      coins: gs.coins,
      distance: Math.floor(gs.distance),
      combo: gs.combo,
      difficulty: gs.difficulty,
      achievements
    })

    let frames = 0
    const animateEnd = () => {
      this._draw()
      this._updateParticles(1)
      frames++
      if (frames < 35) requestAnimationFrame(animateEnd)
    }
    animateEnd()
  }
}
