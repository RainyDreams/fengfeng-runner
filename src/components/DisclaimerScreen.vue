<template>
  <div class="overlay">
    <div class="modal-card disclaimer-card">
      <div class="modal-header">
        <h2>玩家须知</h2>
      </div>
      <div class="modal-body">
        <div class="disclaimer-content">
          <p>🎮 欢迎来到<strong>峰峰跑酷</strong></p>
          <ul>
            <li>本游戏<strong>仅供娱乐</strong>，不带有任何指向性</li>
            <li>本平台仅负责提供平台服务</li>
            <li>对用户行为不承担任何责任</li>
          </ul>
          <p class="disclaimer-warn">继续游戏即表示您已阅读并同意以上条款</p>
        </div>
      </div>
      <div class="modal-actions">
        <button class="modal-btn primary large" @click="$emit('agree')">
          我已阅读并同意
        </button>
        <button class="modal-btn back" @click="$emit('decline')">
          不同意，退出
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineEmits(['agree', 'decline'])
</script>

<style scoped>
.disclaimer-card {
  max-width: 360px;
}

.disclaimer-content {
  text-align: left;
}

.disclaimer-content p {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 12px;
}

.disclaimer-content ul {
  list-style: none;
  padding: 0;
  margin: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.disclaimer-content li {
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.85rem;
  line-height: 1.5;
  padding-left: 20px;
  position: relative;
}

.disclaimer-content li::before {
  content: '•';
  position: absolute;
  left: 6px;
  color: #10a37f;
}

.disclaimer-warn {
  color: rgba(255, 200, 50, 0.7) !important;
  font-size: 0.78rem !important;
  text-align: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
</style>
