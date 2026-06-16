<template>
  <div class="overlay" @click.self="skip">
    <div class="modal-card">
      <div class="modal-header">
        <h2>{{ canSkip ? '设置昵称' : '给自己取个名字' }}</h2>
      </div>
      <div class="modal-body">
        <p class="modal-desc" v-if="!canSkip">给自己取一个酷炫的名字吧！</p>
        <p class="modal-desc" v-else>你可以修改昵称，或继续使用当前名称。</p>
        <div class="input-wrapper">
          <input
            ref="inputRef"
            type="text"
            maxlength="12"
            placeholder="输入昵称（2-12字）"
            v-model="inputValue"
            @keyup.enter="save"
          >
          <span class="input-count">{{ inputValue.length }}/12</span>
        </div>
        <p class="input-hint">支持中文、英文、数字</p>
      </div>
      <div class="modal-actions">
        <button class="modal-btn primary large" @click="save" :disabled="saving">
          {{ saving ? '保存中...' : (canSkip ? '保存' : '确定') }}
        </button>
        <button class="modal-btn secondary" @click="randomize">随机生成</button>
        <button v-if="canSkip" class="modal-btn back" @click="skip">
          使用「{{ user.username }}」
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/user.js'

const props = defineProps({
  canSkip: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])
const user = useUserStore()

const inputValue = ref(user.username)
const inputRef = ref(null)
const saving = ref(false)

onMounted(() => {
  inputRef.value?.focus()
})

async function save() {
  if (saving.value) return
  const n = inputValue.value.trim()
  if (n.length < 2 || n.length > 12) {
    alert('昵称需要2-12个字符')
    return
  }
  saving.value = true
  await user.setUsername(n)
  saving.value = false
  emit('close', true)
}

function skip() {
  emit('close', false)
}

async function randomize() {
  await user.randomizeUsername()
  inputValue.value = user.username
}
</script>
