<template>
  <div class="danmaku-container">
    <span
      v-for="(msg, i) in visible"
      :key="msg.id"
      class="danmaku-item"
      :style="msg.style"
    >{{ msg.text }}</span>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const messages = [
  '加油！你可以的！',
  '冲冲冲！',
  '你能跑多远？',
  '试试二段跳！',
  '别撞到障碍物啊',
  '这游戏太好玩了',
  '我最高分500！',
  '你行你上啊',
  '简单模式都不行？',
  '冲榜第一！',
  '收集金币！',
  '看到方块就冲！',
  '我赌你跑不过100分',
  '这速度不算什么',
  '再来一局！',
  '稳住我们能赢',
  '别放弃！',
  '你能破纪录吗？',
  '手速跟不上了吧',
  '哈哈我过了'
]

const visible = ref([])
let timer = null
let idCounter = 0

function spawn() {
  const text = messages[Math.floor(Math.random() * messages.length)]
  const top = Math.random() * 70 + 5
  const duration = Math.random() * 3 + 4
  const id = idCounter++

  const msg = {
    id,
    text,
    style: {
      top: `${top}%`,
      animationDuration: `${duration}s`,
      opacity: Math.random() * 0.3 + 0.2,
      fontSize: `${Math.random() * 0.3 + 0.75}rem`
    }
  }

  visible.value.push(msg)

  setTimeout(() => {
    visible.value = visible.value.filter(m => m.id !== id)
  }, duration * 1000)
}

onMounted(() => {
  spawn()
  timer = setInterval(spawn, 1200)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.danmaku-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
}

.danmaku-item {
  position: absolute;
  right: -100%;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  animation: danmakuScroll linear forwards;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

@keyframes danmakuScroll {
  from { right: -100%; }
  to { right: 100%; }
}
</style>
