import { defineStore } from 'pinia'
import { ref } from 'vue'
import { get, set, getJSON } from '../utils/storage.js'
import { getBrowserId } from '../utils/browserId.js'

const ADJECTIVES = ['快乐的', '奔跑的', '跳跃的', '勇敢的', '聪明的', '灵活的', '极速的', '无敌的']
const NOUNS = ['跑者', '选手', '高手', '冠军', '达人', '健将', '飞人', '勇士']

function randomUsername() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num = Math.floor(Math.random() * 1000)
  return `${adj}${noun}${num}`
}

export const useUserStore = defineStore('user', () => {
  const browserId = getBrowserId()
  const username = ref(get('username') || randomUsername())
  const highScore = ref(parseInt(get('highScore')) || 0)
  const difficulty = ref(get('difficulty') || 'normal')

  function setUsername(name) {
    const n = name.trim()
    if (n.length < 2 || n.length > 12) return Promise.resolve(false)
    username.value = n
    set('username', n)
    return resubmitBest().then(() => true)
  }

  function randomizeUsername() {
    username.value = randomUsername()
    set('username', username.value)
    return resubmitBest()
  }

  function resubmitBest() {
    const history = getJSON('history', [])
    if (history.length === 0) return Promise.resolve()

    const best = history.reduce((max, s) => s.score > max.score ? s : max, history[0])
    return fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score: best.score,
        username: username.value,
        browserId,
        coins: best.coins || 0,
        distance: best.distance || 0,
        difficulty: best.difficulty || 'normal',
        timestamp: Date.now()
      })
    }).catch(() => {})
  }

  function setHighScore(score) {
    if (score > highScore.value) {
      highScore.value = score
      set('highScore', score)
      return true
    }
    return false
  }

  function setDifficulty(d) {
    difficulty.value = d
    set('difficulty', d)
  }

  return { browserId, username, highScore, difficulty, setUsername, randomizeUsername, setHighScore, setDifficulty }
})
