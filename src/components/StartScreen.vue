<template>
  <div class="overlay">
    <DanmakuLayer />
    <div class="start-content">
      <div class="hero-section">
        <div class="avatar-wrapper">
          <div class="avatar-ring"></div>
          <img src="/images/fengfeng.png" alt="峰峰" class="avatar-img" @error="e => e.target.classList.add('hidden')">
          <div class="avatar-fallback">🏃</div>
        </div>
        <h2 class="game-title">峰峰跑酷</h2>
        <p class="game-subtitle">避开障碍物，收集金币，看看能跑多远！</p>
      </div>

      <div class="user-card" @click="$emit('edit-username')">
        <div class="user-card-left">
          <div class="user-avatar-small">👤</div>
          <div class="user-info">
            <span class="user-name">{{ user.username }}</span>
            <span class="user-badge">点击修改用户名</span>
          </div>
        </div>
        <span class="user-card-right">✏️</span>
      </div>

      <div class="difficulty-card">
        <div class="card-header">
          <span class="card-icon">⚡</span>
          <span class="card-title">难度选择</span>
        </div>
        <div class="diff-grid">
          <button
            v-for="d in difficulties"
            :key="d.key"
            class="diff-btn"
            :class="{ active: user.difficulty === d.key }"
            @click="user.setDifficulty(d.key)"
          >
            <span class="diff-emoji">{{ d.emoji }}</span>
            <span class="diff-name">{{ d.label }}</span>
            <span class="diff-desc">{{ d.mult }}x</span>
          </button>
        </div>
      </div>

      <div class="challenge-text">
        <span class="challenge-emoji">😏</span>
        <span>你跑不过我你信吗？！</span>
      </div>

      <button
        class="main-play-btn"
        :disabled="!ready"
        @click="$emit('start')"
      >
        <span class="play-icon">▶</span>
        <span class="play-text">{{ ready ? '开始游戏' : `加载中 ${loadProgress}%` }}</span>
        <kbd class="btn-kbd">空格</kbd>
      </button>

      <div class="action-buttons">
        <button class="action-btn" @click="$emit('leaderboard')">
          <span class="action-icon">🏆</span>
          <span class="action-text">排行榜</span>
          <kbd class="btn-kbd">L</kbd>
        </button>
      </div>

      <div class="controls-hint">
        <span class="hint-item"><kbd>空格</kbd> 跳跃</span>
        <span class="hint-dot">·</span>
        <span class="hint-item"><kbd>点击</kbd> 跳跃</span>
        <span class="hint-dot">·</span>
        <span class="hint-item">支持二段跳</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useUserStore } from '../stores/user.js'
import DanmakuLayer from './DanmakuLayer.vue'

defineProps({
  loadProgress: { type: Number, default: 0 },
  ready: { type: Boolean, default: false }
})

defineEmits(['start', 'leaderboard', 'edit-username'])

const user = useUserStore()

const difficulties = [
  { key: 'easy',   emoji: '🌱', label: '简单', mult: 0.7 },
  { key: 'normal', emoji: '⚖️', label: '普通', mult: 1.0 },
  { key: 'hard',   emoji: '🔥', label: '困难', mult: 1.2 },
  { key: 'expert', emoji: '💀', label: '专家', mult: 1.4 }
]
</script>
