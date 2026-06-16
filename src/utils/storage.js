const PREFIX = 'zxfls_'

export function get(key, fallback = null) {
  try {
    const v = localStorage.getItem(PREFIX + key)
    return v === null ? fallback : v
  } catch { return fallback }
}

export function set(key, value) {
  try { localStorage.setItem(PREFIX + key, String(value)) } catch {}
}

export function getJSON(key, fallback = []) {
  try {
    const v = localStorage.getItem(PREFIX + key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}

export function setJSON(key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)) } catch {}
}
