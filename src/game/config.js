export const CONFIG = {
  dpr: Math.min(window.devicePixelRatio || 1, 2),
  maxSpeed: 12,
  baseSpeed: 4.5,
  jumpForce: -14,
  doubleJumpForce: -16,
  gravity: 0.6,
  coinSize: 22,
  comboTimeout: 2500,
  particleLimit: 80,
  obstacleWidth: 56,
  questionBlockWidth: 46,
  questionBlockFloatY: 140,
  difficulties: {
    easy:   { speedMult: 0.7, obstacleMult: 0.6, scoreMult: 0.8, label: '简单' },
    normal: { speedMult: 1,   obstacleMult: 1,    scoreMult: 1,   label: '普通' },
    hard:   { speedMult: 1.2, obstacleMult: 1.4,  scoreMult: 1.5, label: '困难' },
    expert: { speedMult: 1.4, obstacleMult: 1.8,  scoreMult: 2,   label: '专家' }
  },
  questionBlocks: [
    { imageKey: 'grass_block',      height: 46 },
    { imageKey: 'green_crate',      height: 58 },
    { imageKey: 'loot_box',         height: 36 },
    { imageKey: 'bottle_fizzing',   height: 39 },
    { imageKey: 'cookie',           height: 57 },
    { imageKey: 'ice_cream_bar',    height: 59 }
  ],
  powerUps: [
    { type: 'life',   label: '+1 命',   color: '#ff4444', icon: '❤' },
    { type: 'coins',  label: '+50 币',  color: '#FFD700', icon: '🪙' },
    { type: 'shield', label: '无敌5秒', color: '#00ff88', icon: '🛡' },
    { type: 'score',  label: '+100 分', color: '#06b6d4', icon: '⭐' }
  ],
  obstacles: {
    easy: [
      { imageKey: 'can_opened',       height: 57, points: 8 },
      { imageKey: 'cola_exploding',   height: 54, points: 10 }
    ],
    normal: [
      { imageKey: 'mango_bars',       height: 56, points: 10 },
      { imageKey: 'ice_cream_stack',  height: 58, points: 12 },
      { imageKey: 'can_opened',       height: 57, points: 10 },
      { imageKey: 'cola_exploding',   height: 54, points: 12 }
    ],
    hard: [
      { imageKey: 'can_exploding',    height: 78, points: 14 },
      { imageKey: 'golden_potion',    height: 52, points: 14 },
      { imageKey: 'golden_wrappers',  height: 67, points: 16 },
      { imageKey: 'ice_cream_broken', height: 63, points: 16 },
      { imageKey: 'bottle',           height: 152, points: 18 }
    ],
    expert: [
      { imageKey: 'cornetto',         height: 143, points: 20 },
      { imageKey: 'drink_container',  height: 143, points: 20 },
      { imageKey: 'bottle_exploding', height: 139, points: 22 },
      { imageKey: 'bottles_stacked',  height: 98,  points: 22 },
      { imageKey: 'ice_cream_holder', height: 139, points: 24 }
    ]
  }
}
