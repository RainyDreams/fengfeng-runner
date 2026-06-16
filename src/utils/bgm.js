import { ref } from 'vue'

const audio = new Audio('/bgm.m4a')
audio.loop = true
audio.volume = 0.3

export const bgmPlaying = ref(false)
export const bgmLoaded = ref(false)

audio.addEventListener('canplaythrough', () => {
  bgmLoaded.value = true
})

export function playBgm() {
  audio.play().then(() => {
    bgmPlaying.value = true
  }).catch(() => {})
}

export function pauseBgm() {
  audio.pause()
  bgmPlaying.value = false
}

export function toggleBgm() {
  if (bgmPlaying.value) {
    pauseBgm()
  } else {
    playBgm()
  }
}

export function setBgmVolume(v) {
  audio.volume = Math.max(0, Math.min(1, v))
}
