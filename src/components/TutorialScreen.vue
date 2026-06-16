<template>
  <div class="overlay">
    <div class="tutorial-card">
      <div class="tutorial-header">
        <div class="tutorial-step-indicator">
          <span v-for="i in steps.length" :key="i" class="step-dot" :class="{ active: i - 1 === step, done: i - 1 < step }"></span>
        </div>
      </div>

      <div class="tutorial-body">
        <transition name="slide" mode="out-in">
          <div :key="step" class="tutorial-step">
            <div class="step-icon">{{ steps[step].icon }}</div>
            <h3>{{ steps[step].title }}</h3>
            <p>{{ steps[step].desc }}</p>
            <div class="step-visual" v-if="steps[step].visual">
              <div class="visual-keys" v-if="steps[step].visual === 'keys'">
                <template v-if="isMobile">
                  <div class="touch-demo">
                    <span class="touch-icon">👆</span>
                    <span>点击屏幕任意位置</span>
                  </div>
                </template>
                <template v-else>
                  <kbd>空格</kbd> <kbd>↑</kbd> <kbd>W</kbd>
                  <span class="visual-hint">或点击屏幕</span>
                </template>
              </div>
              <div class="visual-double" v-if="steps[step].visual === 'double'">
                <div class="jump-demo">
                  <span class="jump-icon">🦘</span>
                  <span class="jump-x2">×2</span>
                </div>
              </div>
              <div class="visual-blocks" v-if="steps[step].visual === 'blocks'">
                <span class="block-demo q">?</span>
                <span class="block-demo ob">🚧</span>
              </div>
              <div class="visual-hearts" v-if="steps[step].visual === 'hearts'">
                <span v-for="i in 3" :key="i" class="heart-demo">❤</span>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <div class="tutorial-actions">
        <button v-if="step > 0" class="modal-btn secondary" @click="step--">上一步</button>
        <button v-if="step < steps.length - 1" class="modal-btn primary" @click="step++">下一步</button>
        <button v-else class="modal-btn primary large" @click="$emit('close')">开始游戏！</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

defineEmits(['close'])

const step = ref(0)
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 768

const steps = computed(() => {
  if (isMobile.value) {
    return [
      {
        icon: '🎮',
        title: '欢迎来到峰峰跑酷！',
        desc: '这是一款简单有趣的跑酷游戏，让我们来了解一下基本操作。',
        visual: null
      },
      {
        icon: '👆',
        title: '跳跃',
        desc: '点击屏幕任意位置即可跳跃，支持二段跳！',
        visual: 'keys'
      },
      {
        icon: '🦘',
        title: '二段跳',
        desc: '在空中再点一次屏幕，可以跳得更高！',
        visual: 'double'
      },
      {
        icon: '❓',
        title: '功能方块',
        desc: '看到发光的方块要尽量碰到！会给你加命、金币、无敌或加分。',
        visual: 'blocks'
      },
      {
        icon: '❤️',
        title: '生命值',
        desc: '你有1条命，碰到障碍物会扣1命。命没了就游戏结束！',
        visual: 'hearts'
      },
      {
        icon: '🚀',
        title: '准备好了吗？',
        desc: '收集金币、躲避障碍、挑战高分！祝你好运！',
        visual: null
      }
    ]
  }
  return [
    {
      icon: '🎮',
      title: '欢迎来到峰峰跑酷！',
      desc: '这是一款简单有趣的跑酷游戏，让我们来了解一下基本操作。',
      visual: null
    },
    {
      icon: '⬆️',
      title: '跳跃',
      desc: '按空格键、方向键上、W键或点击屏幕来跳跃。',
      visual: 'keys'
    },
    {
      icon: '🦘',
      title: '二段跳',
      desc: '在空中再按一次跳跃键，可以进行二段跳，跳得更高！',
      visual: 'double'
    },
    {
      icon: '❓',
      title: '功能方块',
      desc: '遇到发光的方块要尽量碰到它！会给你加命、金币、无敌或加分。',
      visual: 'blocks'
    },
    {
      icon: '❤️',
      title: '生命值',
      desc: '你有1条命，碰到障碍物会扣1命。命没了就游戏结束，小心！',
      visual: 'hearts'
    },
    {
      icon: '🚀',
      title: '准备好了吗？',
      desc: '收集金币、躲避障碍、挑战高分！祝你好运！',
      visual: null
    }
  ]
})
</script>

<style scoped>
.tutorial-card {
  width: 100%;
  max-width: 340px;
  background: rgba(20, 20, 28, 0.95);
  backdrop-filter: blur(32px);
  -webkit-backdrop-filter: blur(32px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  overflow: hidden;
  animation: modalIn 400ms cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.92) translateY(16px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.tutorial-header {
  padding: 20px 20px 0;
}

.tutorial-step-indicator {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  transition: all 0.3s ease;
}

.step-dot.active {
  background: #10a37f;
  width: 24px;
  border-radius: 4px;
}

.step-dot.done {
  background: rgba(16, 163, 127, 0.4);
}

.tutorial-body {
  padding: 28px 24px;
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tutorial-step {
  text-align: center;
  width: 100%;
}

.step-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  animation: iconPop 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes iconPop {
  from { transform: scale(0.5) rotate(-10deg); opacity: 0; }
  to { transform: scale(1) rotate(0); opacity: 1; }
}

.tutorial-step h3 {
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: 10px;
  color: #fff;
}

.tutorial-step p {
  font-size: 0.88rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
  margin-bottom: 20px;
}

.step-visual {
  margin-top: 16px;
}

.visual-keys {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.visual-keys kbd {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 16px;
  font-family: inherit;
  font-size: 0.9rem;
  color: #fff;
  font-weight: 500;
  animation: keyPress 1.5s ease-in-out infinite;
}

.visual-keys kbd:nth-child(2) { animation-delay: 0.3s; }
.visual-keys kbd:nth-child(3) { animation-delay: 0.6s; }

@keyframes keyPress {
  0%, 100% { transform: translateY(0); }
  30% { transform: translateY(3px); box-shadow: none; }
}

.visual-hint {
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.75rem;
}

.touch-demo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.touch-icon {
  font-size: 2.5rem;
  animation: touchPulse 1.2s ease-in-out infinite;
}

@keyframes touchPulse {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.15); opacity: 1; }
}

.visual-double {
  display: flex;
  justify-content: center;
}

.jump-demo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 2rem;
  animation: jumpAnim 1.2s ease-in-out infinite;
}

@keyframes jumpAnim {
  0%, 100% { transform: translateY(0); }
  40% { transform: translateY(-20px); }
  60% { transform: translateY(-15px); }
}

.jump-x2 {
  font-size: 1.2rem;
  color: #FFD700;
  font-weight: 700;
}

.visual-blocks {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.block-demo {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 1.5rem;
  font-weight: 700;
}

.block-demo.q {
  background: rgba(255, 215, 0, 0.2);
  border: 2px solid rgba(255, 215, 0, 0.4);
  color: #FFD700;
  animation: blockBounce 1s ease-in-out infinite;
}

.block-demo.ob {
  background: rgba(255, 68, 68, 0.15);
  border: 2px solid rgba(255, 68, 68, 0.3);
  font-size: 1.3rem;
}

@keyframes blockBounce {
  0%, 100% { transform: translateY(0); box-shadow: 0 0 10px rgba(255, 215, 0, 0.2); }
  50% { transform: translateY(-5px); box-shadow: 0 0 20px rgba(255, 215, 0, 0.4); }
}

.visual-hearts {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.heart-demo {
  font-size: 1.8rem;
  color: #ff4444;
  animation: heartBeat 1s ease-in-out infinite;
}

.heart-demo:nth-child(2) { animation-delay: 0.2s; }
.heart-demo:nth-child(3) { animation-delay: 0.4s; }

@keyframes heartBeat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.tutorial-actions {
  padding: 0 24px 24px;
  display: flex;
  gap: 10px;
}

.tutorial-actions .modal-btn {
  flex: 1;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>
