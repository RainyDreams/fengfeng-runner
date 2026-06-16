import { get, set } from './storage.js'

export const APP_VERSION = '3.1.0'

export function checkVersion() {
  const stored = get('app_version')
  const isFirstVisit = !stored
  const isUpdated = stored !== APP_VERSION

  set('app_version', APP_VERSION)

  return { isFirstVisit, isUpdated }
}

export function isSystemName(name) {
  const adjectives = ['快乐的', '奔跑的', '跳跃的', '勇敢的', '聪明的', '灵活的', '极速的', '无敌的']
  const nouns = ['跑者', '选手', '高手', '冠军', '达人', '健将', '飞人', '勇士']
  return adjectives.some(a => name.startsWith(a)) && nouns.some(n => name.includes(n))
}
