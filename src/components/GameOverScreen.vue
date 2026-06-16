<template>
  <div class="overlay">
    <div class="modal-card gameover-card">
      <div class="gameover-header">
        <div class="gameover-icon">💥</div>
        <h2>游戏结束</h2>
      </div>
      <div class="gameover-score">
        <span class="score-number">{{ result?.score ?? 0 }}</span>
        <span class="score-unit">分</span>
      </div>
      <div class="gameover-achievements">{{ resultText }}</div>
      <div class="gameover-actions">
        <button class="modal-btn primary large" @click="$emit('restart')">
          再玩一次
          <kbd class="btn-kbd">空格</kbd>
        </button>
        <div class="gameover-secondary">
          <button class="modal-btn secondary" @click="$emit('leaderboard')">
            排行榜
            <kbd class="btn-kbd-sm">L</kbd>
          </button>
          <button class="modal-btn back" @click="$emit('back')">
            返回
            <kbd class="btn-kbd-sm">Esc</kbd>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  result: { type: Object, default: null }
})

defineEmits(['restart', 'leaderboard', 'back'])

const resultText = computed(() => {
  const r = props.result
  if (!r) return ''
  if (r.achievements?.length > 0) return `获得成就: ${r.achievements.join('、')}`
  if (r.score >= 50) return '不错哦，继续加油！'
  return '再试一次吧！'
})
</script>
