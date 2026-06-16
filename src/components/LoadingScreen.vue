<template>
  <div class="loading-screen" :class="{ 'fade-out': done }">
    <div class="loading-bg">
      <div class="loading-particles">
        <span v-for="i in 20" :key="i" class="l-particle" :style="particleStyle(i)"></span>
      </div>
      <div class="loading-grid"></div>
    </div>

    <div class="loading-content">
      <div class="loading-logo">
        <div class="logo-ring"></div>
        <div class="logo-ring ring-2"></div>
        <div class="logo-icon">🏃</div>
      </div>

      <h1 class="loading-title">
        <span v-for="(char, i) in title" :key="i" class="title-char" :style="{ animationDelay: `${i * 0.08}s` }">{{ char }}</span>
      </h1>

      <div class="loading-bar-container">
        <div class="loading-bar">
          <div class="loading-bar-fill" :style="{ width: `${progress}%` }"></div>
          <div class="loading-bar-glow" :style="{ left: `${progress}%` }"></div>
        </div>
        <div class="loading-info">
          <span class="loading-percent">{{ progress }}%</span>
          <span class="loading-status">{{ statusText }}</span>
        </div>
      </div>

      <div class="loading-tips">
        <p>{{ currentTip }}</p>
      </div>
    </div>

    <div class="loading-footer">
      <span class="loading-version">v3.0</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  progress: { type: Number, default: 0 },
  done: { type: Boolean, default: false }
})

const title = '峰峰跑酷'

const tips = [
  '提示：支持二段跳，空中再按一次跳跃键',
  '提示：问号方块可以给你各种增益效果',
  '提示：收集金币可以获得额外分数',
  '提示：连击可以获得更多分数加成',
  '提示：简单模式适合新手练习',
  '提示：每个难度都有不同的障碍物',
  '提示：命没了就 Game Over 了，小心！'
]

const currentTipIndex = ref(0)
const currentTip = ref(tips[0])
let tipTimer = null

onMounted(() => {
  tipTimer = setInterval(() => {
    currentTipIndex.value = (currentTipIndex.value + 1) % tips.length
    currentTip.value = tips[currentTipIndex.value]
  }, 3000)
})

onUnmounted(() => {
  if (tipTimer) clearInterval(tipTimer)
})

const statusText = computed(() => {
  if (props.progress < 30) return '正在加载资源...'
  if (props.progress < 60) return '准备游戏引擎...'
  if (props.progress < 90) return '初始化场景...'
  return '即将开始...'
})

function particleStyle(i) {
  const x = Math.random() * 100
  const y = Math.random() * 100
  const size = Math.random() * 4 + 2
  const duration = Math.random() * 3 + 2
  const delay = Math.random() * 2
  return {
    left: `${x}%`,
    top: `${y}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`
  }
}
</script>

<style scoped>
.loading-screen {
  position: fixed;
  inset: 0;
  background: #0a0a0f;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  transition: opacity 0.8s ease, transform 0.8s ease;
}

.loading-screen.fade-out {
  opacity: 0;
  transform: scale(1.05);
  pointer-events: none;
}

.loading-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.loading-particles {
  position: absolute;
  inset: 0;
}

.l-particle {
  position: absolute;
  background: rgba(16, 163, 127, 0.4);
  border-radius: 50%;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
  50% { transform: translateY(-20px) scale(1.5); opacity: 0.8; }
}

.loading-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(16, 163, 127, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(16, 163, 127, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  animation: gridMove 20s linear infinite;
}

@keyframes gridMove {
  0% { transform: translate(0, 0); }
  100% { transform: translate(40px, 40px); }
}

.loading-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

.loading-logo {
  position: relative;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-ring {
  position: absolute;
  inset: 0;
  border: 2px solid rgba(16, 163, 127, 0.3);
  border-radius: 50%;
  animation: ringPulse 2s ease-in-out infinite;
}

.ring-2 {
  inset: -10px;
  border-color: rgba(6, 182, 212, 0.2);
  animation-delay: 0.5s;
  animation-duration: 2.5s;
}

@keyframes ringPulse {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.1); opacity: 0.6; }
}

.logo-icon {
  font-size: 3rem;
  animation: logoBounce 1.5s ease-in-out infinite;
}

@keyframes logoBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.loading-title {
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  background: linear-gradient(135deg, #10a37f, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-char {
  display: inline-block;
  animation: charReveal 0.5s ease-out both;
}

@keyframes charReveal {
  from { opacity: 0; transform: translateY(20px) scale(0.8); filter: blur(4px); }
  to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}

.loading-bar-container {
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.loading-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}

.loading-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #10a37f, #06b6d4);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.loading-bar-glow {
  position: absolute;
  top: -4px;
  width: 20px;
  height: 12px;
  background: rgba(16, 163, 127, 0.6);
  border-radius: 50%;
  filter: blur(6px);
  transition: left 0.3s ease;
}

.loading-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
}

.loading-percent {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.loading-status {
  color: rgba(255, 255, 255, 0.4);
}

.loading-tips {
  height: 20px;
  overflow: hidden;
}

.loading-tips p {
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.8rem;
  animation: tipFade 3s ease-in-out infinite;
}

@keyframes tipFade {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}

.loading-footer {
  position: absolute;
  bottom: 24px;
}

.loading-version {
  color: rgba(255, 255, 255, 0.15);
  font-size: 0.7rem;
}
</style>
