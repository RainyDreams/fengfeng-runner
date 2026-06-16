import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_FILE = path.join(__dirname, 'data')

let db = null
let useSqlite = false

async function initDB() {
  try {
    const { default: Database } = await import('better-sqlite3')
    db = new Database(DB_FILE + '.db')
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')
    db.exec(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        browser_id TEXT PRIMARY KEY,
        username TEXT NOT NULL DEFAULT '匿名玩家',
        score INTEGER NOT NULL DEFAULT 0,
        coins INTEGER NOT NULL DEFAULT 0,
        distance INTEGER NOT NULL DEFAULT 0,
        difficulty TEXT NOT NULL DEFAULT 'normal',
        updated_at INTEGER NOT NULL DEFAULT 0
      )
    `)
    useSqlite = true
    console.log('  📦 使用 SQLite 存储')
  } catch {
    console.log('  📦 使用 JSON 文件存储')
  }
}

// JSON fallback
const JSON_FILE = DB_FILE + '.json'
let jsonData = { leaderboard: [] }

function loadJSON() {
  try {
    if (fs.existsSync(JSON_FILE)) {
      jsonData = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'))
    }
  } catch {
    jsonData = { leaderboard: [] }
  }
}

function saveJSON() {
  try {
    fs.writeFileSync(JSON_FILE, JSON.stringify(jsonData), 'utf-8')
  } catch (e) {
    console.error('JSON save error:', e.message)
  }
}

loadJSON()

export async function init() {
  await initDB()
}

export function saveScore({ browserId, username, score, coins, distance, difficulty, timestamp }) {
  const entry = {
    score: Math.floor(score || 0),
    username: username || '匿名玩家',
    browserId,
    coins: coins || 0,
    distance: distance || 0,
    difficulty: difficulty || 'normal',
    timestamp: timestamp || Date.now()
  }

  if (useSqlite) {
    const stmt = db.prepare(`
      INSERT INTO leaderboard (browser_id, username, score, coins, distance, difficulty, updated_at)
      VALUES (@browserId, @username, @score, @coins, @distance, @difficulty, @timestamp)
      ON CONFLICT(browser_id) DO UPDATE SET
        username = @username,
        score = CASE WHEN @score > score THEN @score ELSE score END,
        coins = CASE WHEN @score > score THEN @coins ELSE coins END,
        distance = CASE WHEN @score > score THEN @distance ELSE distance END,
        difficulty = CASE WHEN @score > score THEN @difficulty ELSE difficulty END,
        updated_at = @timestamp
    `)
    stmt.run(entry)

    const rank = db.prepare('SELECT COUNT(*) + 1 as rank FROM leaderboard WHERE score > (SELECT score FROM leaderboard WHERE browser_id = ?)').get(browserId)
    return { success: true, rank: rank.rank }
  }

  // JSON fallback
  const existing = jsonData.leaderboard.findIndex(s => s.browserId === browserId)
  if (existing >= 0) {
    const old = jsonData.leaderboard[existing]
    old.username = entry.username
    if (entry.score > old.score) {
      old.score = entry.score
      old.coins = entry.coins
      old.distance = entry.distance
      old.difficulty = entry.difficulty
    }
    old.timestamp = entry.timestamp
  } else {
    jsonData.leaderboard.push(entry)
  }

  jsonData.leaderboard.sort((a, b) => b.score - a.score)
  jsonData.leaderboard = jsonData.leaderboard.slice(0, 100)
  saveJSON()

  const rank = jsonData.leaderboard.findIndex(s => s.browserId === browserId) + 1
  return { success: true, rank }
}

export function getLeaderboard() {
  if (useSqlite) {
    return db.prepare('SELECT browser_id as browserId, username, score, coins, distance, difficulty, updated_at as timestamp FROM leaderboard ORDER BY score DESC LIMIT 50').all()
  }
  return jsonData.leaderboard.slice(0, 50)
}

export function getStats() {
  if (useSqlite) {
    const row = db.prepare('SELECT COUNT(*) as total FROM leaderboard').get()
    return { total: row.total }
  }
  return { total: jsonData.leaderboard.length }
}

export function clearLeaderboard() {
  if (useSqlite) {
    db.exec('DELETE FROM leaderboard')
  } else {
    jsonData.leaderboard = []
    saveJSON()
  }
}

export function close() {
  if (useSqlite && db) {
    db.close()
    db = null
  } else {
    saveJSON()
  }
}
