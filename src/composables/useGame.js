import { ref, reactive, onUnmounted } from 'vue'
import { GameEngine } from '../game/engine.js'
import { loadImages } from '../game/images.js'
import { useUserStore } from '../stores/user.js'
import { getJSON, setJSON } from '../utils/storage.js'

export function useGame() {
  const user = useUserStore()
  let engine = null

  const loadProgress = ref(0)
  const ready = ref(false)
  const screen = ref('start')
  const gameResult = ref(null)

  const live = reactive({
    score: 0,
    coins: 0,
    combo: 0,
    speed: 0,
    distance: 0,
    lives: 1,
    running: false,
    paused: false
  })

  function init(canvasEl) {
    loadImages((loaded, total) => {
      loadProgress.value = Math.round((loaded / total) * 100)
      if (loaded >= total * 0.5) ready.value = true
    })

    engine = new GameEngine(canvasEl)
    engine.onStateSync((s) => Object.assign(live, s))
    engine.onScoreChange((score) => { live.score = score })
    engine.onCoinsChange((coins) => { live.coins = coins })
    engine.onComboChange((combo) => { live.combo = combo })
    engine.onLivesChange((lives) => { live.lives = lives })
    engine.onGameOver((result) => {
      gameResult.value = result
      screen.value = 'gameover'
      saveScore(result)
    })

    const resize = () => engine?.initCanvas()
    window.addEventListener('resize', resize)
    engine.initCanvas()

    onUnmounted(() => {
      engine?.destroy()
      window.removeEventListener('resize', resize)
    })
  }

  function startGame() {
    if (!engine || !ready.value) return
    screen.value = 'playing'
    engine.start(user.difficulty)
  }

  function jump() { engine?.jump() }
  function pauseGame() { engine?.pause() }
  function resumeGame() { engine?.resume() }
  function quitGame() { engine?.quit() }

  function saveScore(result) {
    const history = getJSON('history', [])
    history.push({
      score: result.score,
      coins: result.coins,
      distance: result.distance,
      difficulty: result.difficulty,
      timestamp: Date.now()
    })
    setJSON('history', history.slice(-100))

    const isNewBest = user.setHighScore(result.score)

    submitToAPI(result.score, result.coins, result.distance, result.difficulty)
  }

  function submitToAPI(score, coins, distance, difficulty) {
    fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score,
        username: user.username,
        browserId: user.browserId,
        coins,
        distance,
        difficulty,
        timestamp: Date.now()
      })
    }).catch(() => {})
  }

  async function fetchLeaderboard() {
    try {
      const res = await fetch(`/api/scores?t=${Date.now()}`)
      const data = await res.json()
      if (data.success && data.scores.length > 0) {
        const best = new Map()
        data.scores.forEach(s => {
          const id = s.browserId
          if (!best.has(id) || s.score > best.get(id).score) {
            best.set(id, s)
          }
        })
        return Array.from(best.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, 15)
      }
    } catch {}

    const history = getJSON('history', [])
    if (history.length === 0) return []

    const best = history.reduce((max, s) => s.score > max.score ? s : max, history[0])
    return [{
      score: best.score,
      username: user.username,
      browserId: user.browserId,
      coins: best.coins || 0,
      distance: best.distance || 0,
      difficulty: best.difficulty || 'normal',
      date: new Date(best.timestamp).toLocaleDateString('zh-CN')
    }]
  }

  return {
    init, startGame, jump, pauseGame, resumeGame, quitGame,
    loadProgress, ready, screen, gameResult, live,
    fetchLeaderboard
  }
}
