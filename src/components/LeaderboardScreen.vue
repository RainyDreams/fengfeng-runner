<template>
  <div class="overlay">
    <div class="modal-card leaderboard-modal">
      <div class="modal-header">
        <h2>排行榜</h2>
        <button class="modal-close" @click="$emit('back')">
          ✕
          <kbd class="btn-kbd-sm">Esc</kbd>
        </button>
      </div>
      <div class="modal-body">
        <div v-if="myStats" class="my-stats">
          <div class="stat-item">
            <span class="stat-label">🏆 我的最高</span>
            <span class="stat-value highlight">{{ myStats.best }}分</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">📊 上次分数</span>
            <span class="stat-value">{{ myStats.last }}分</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">📈 平均分数</span>
            <span class="stat-value">{{ myStats.avg }}分</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">🎮 总场次</span>
            <span class="stat-value">{{ myStats.games }}</span>
          </div>
        </div>

        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="scores.length === 0" class="empty">暂无记录</div>
        <div v-else class="leaderboard-list">
          <div
            v-for="(item, i) in scores"
            :key="item.browserId"
            class="score-item"
            :class="{ top: i < 3, me: item.browserId === user.browserId }"
          >
            <span class="rank">{{ medals[i] || (i + 1) }}</span>
            <div class="info">
              <span class="name">
                {{ item.username || '匿名玩家' }}
                <span v-if="item.browserId === user.browserId" class="me-badge">我</span>
              </span>
              <span class="score">{{ item.score }}分</span>
              <span class="detail">{{ item.coins || 0 }}币 · {{ item.distance || 0 }}m · {{ diffLabel(item.difficulty) }}</span>
            </div>
            <span class="date">{{ item.date || '' }}</span>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="modal-btn back" @click="$emit('back')">返回</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../stores/user.js'
import { getJSON } from '../utils/storage.js'
import { CONFIG } from '../game/config.js'

const props = defineProps({
  fetchFn: { type: Function, required: true }
})

defineEmits(['back'])

const user = useUserStore()
const scores = ref([])
const loading = ref(true)
const medals = { 0: '🥇', 1: '🥈', 2: '🥉' }

function diffLabel(key) {
  return CONFIG.difficulties[key]?.label || '普通'
}

const myStats = computed(() => {
  const history = getJSON('history', [])
  if (history.length === 0) return null

  const total = history.reduce((sum, s) => sum + s.score, 0)
  return {
    best: Math.max(...history.map(s => s.score)),
    last: history[history.length - 1].score,
    avg: Math.round(total / history.length),
    games: history.length
  }
})

onMounted(async () => {
  scores.value = await props.fetchFn()
  loading.value = false
})
</script>

<style scoped>
.my-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(16, 163, 127, 0.06);
  border: 1px solid rgba(16, 163, 127, 0.15);
  border-radius: 10px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
}

.stat-label {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.45);
}

.stat-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.stat-value.highlight {
  color: #10a37f;
}
</style>
