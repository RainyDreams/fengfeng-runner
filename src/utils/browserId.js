import { get, set } from './storage.js'

export function getBrowserId() {
  let id = get('browser_id')
  if (id) return id

  const parts = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 4
  ]

  let hash = 0
  const str = parts.join('|')
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }

  id = 'u_' + Math.abs(hash).toString(36)
  set('browser_id', id)
  return id
}
