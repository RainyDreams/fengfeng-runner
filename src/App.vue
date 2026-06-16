<template>
  <div id="game-container">
    <LoadingScreen
      v-if="showLoading"
      :progress="loadProgress"
      :done="loadDone"
    />

    <header v-show="!showLoading" class="game-header">
      <div class="header-left">
        <button v-if="screen !== 'start'" class="header-btn" @click="goHome" title="返回首页">
          ←
        </button>
        <span class="game-icon">🏃</span>
        <h1>峰峰跑酷</h1>
      </div>
      <div class="header-right">
        <button class="header-btn" @click="toggleBgm" :title="bgmPlaying ? '关闭音乐' : '开启音乐'">
          {{ bgmPlaying ? '🔊' : '🔇' }}
        </button>
        <span class="hearts" v-if="screen === 'playing'">
          <span v-for="i in live.lives" :key="i" class="heart">❤</span>
        </span>
        <div class="score-board">
          <span class="sb-label">得分</span>
          <span class="sb-value sb-score">{{ live.score }}</span>
          <span class="sb-divider"></span>
          <span class="sb-label">最高</span>
          <span class="sb-value sb-high">{{ user.highScore }}</span>
        </div>
      </div>
    </header>

    <canvas ref="canvasRef" id="gameCanvas" @contextmenu.prevent></canvas>

    <transition name="fade">
      <div v-if="live.paused" class="pause-overlay" @click="resumeGame(); playBgm()">
        <div class="pause-card">
          <h2>⏸ 已暂停</h2>
          <p>点击继续游戏</p>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <DisclaimerScreen
        v-if="showDisclaimer"
        class="z-disclaimer"
        @agree="agreeDisclaimer"
        @decline="declineDisclaimer"
      />
    </transition>

    <transition name="fade">
      <div v-if="showDeclined" class="overlay z-disclaimer">
        <div class="modal-card">
          <div class="modal-header"><h2>无法游玩</h2></div>
          <div class="modal-body">
            <p class="modal-desc">您需要同意玩家须知才能开始游戏。</p>
          </div>
          <div class="modal-actions">
            <button class="modal-btn primary" @click="showDeclined = false; showDisclaimer = true">重新阅读</button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <TutorialScreen
        v-if="showTutorial"
        class="z-tutorial"
        @close="closeTutorial"
      />
    </transition>

    <transition name="fade">
      <UsernameModal
        v-if="showUsername"
        class="z-username"
        :can-skip="canSkipUsername"
        @close="closeUsername"
      />
    </transition>

    <transition name="fade">
      <StartScreen
        v-if="screen === 'start' && !showLoading && !showDisclaimer && !showTutorial && !showUsername && !showShortcuts"
        :load-progress="100"
        :ready="ready"
        @start="startGame"
        @leaderboard="screen = 'leaderboard'"
        @edit-username="showUsername = true; canSkipUsername = true"
      />
    </transition>

    <transition name="fade">
      <GameOverScreen
        v-if="screen === 'gameover'"
        :result="gameResult"
        @restart="startGame"
        @leaderboard="screen = 'leaderboard'"
        @back="screen = 'start'"
      />
    </transition>

    <transition name="fade">
      <LeaderboardScreen
        v-if="screen === 'leaderboard'"
        @back="handleLeaderboardBack"
        :fetch-fn="fetchLeaderboard"
      />
    </transition>

    <transition name="fade">
      <div v-if="showShortcuts" class="shortcut-guide" @click="closeShortcuts">
        <div class="shortcut-card" @click.stop>
          <h3>快捷键</h3>
          <div class="shortcut-list">
            <div class="shortcut-item"><kbd>空格</kbd><kbd>↑</kbd><kbd>W</kbd><span>跳跃</span></div>
            <div class="shortcut-item"><kbd>空格</kbd><kbd>Enter</kbd><span>开始 / 重玩</span></div>
            <div class="shortcut-item"><kbd>L</kbd><span>排行榜</span></div>
            <div class="shortcut-item"><kbd>U</kbd><span>改名</span></div>
            <div class="shortcut-item"><kbd>←</kbd><span>返回首页</span></div>
            <div class="shortcut-item"><kbd>Esc</kbd><span>返回</span></div>
            <div class="shortcut-item"><span class="hint">支持二段跳</span></div>
          </div>
          <button class="modal-btn primary" @click="closeShortcuts">知道了</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useUserStore } from './stores/user.js'
import { useGame } from './composables/useGame.js'
import { get, set } from './utils/storage.js'
import { checkVersion, isSystemName } from './utils/version.js'
import { bgmPlaying, toggleBgm, playBgm, pauseBgm } from './utils/bgm.js'
import LoadingScreen from './components/LoadingScreen.vue'
import TutorialScreen from './components/TutorialScreen.vue'
import StartScreen from './components/StartScreen.vue'
import GameOverScreen from './components/GameOverScreen.vue'
import LeaderboardScreen from './components/LeaderboardScreen.vue'
import UsernameModal from './components/UsernameModal.vue'
import DisclaimerScreen from './components/DisclaimerScreen.vue'

const APP_VERSION = '3.1.0'

const user = useUserStore()
const { init, startGame: _startGame, jump, pauseGame, resumeGame, quitGame, loadProgress, ready, screen, gameResult, live, fetchLeaderboard } = useGame()

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 768

function startGame() {
  _startGame()
  playBgm()
}

watch(screen, (val) => {
  if (val === 'gameover') {
    pauseBgm()
  }
})

function handleVisibility() {
  if (document.hidden && screen.value === 'playing' && !isMobile) {
    pauseGame()
    pauseBgm()
  }
}

onMounted(() => {
  init(canvasRef.value)
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('visibilitychange', handleVisibility)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('visibilitychange', handleVisibility)
})

const canvasRef = ref(null)
const showUsername = ref(false)
const canSkipUsername = ref(false)
const showShortcuts = ref(false)
const showLoading = ref(true)
const loadDone = ref(false)
const showTutorial = ref(false)
const showDisclaimer = ref(false)
const showDeclined = ref(false)

watch(ready, (val) => {
  if (val) {
    setTimeout(() => {
      loadDone.value = true
      setTimeout(() => {
        showLoading.value = false
        afterLoad()
      }, 800)
    }, 500)
  }
})

function afterLoad() {
  if (!get('disclaimer_agreed')) {
    showDisclaimer.value = true
    return
  }

  const { isFirstVisit, isUpdated } = checkVersion()

  if (isFirstVisit) {
    showTutorial.value = true
    return
  }

  if (isUpdated && isSystemName(user.username)) {
    canSkipUsername.value = true
    showUsername.value = true
    return
  }

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 768
  if (!isMobile && !get('shortcuts_seen')) {
    showShortcuts.value = true
  }
}

function agreeDisclaimer() {
  showDisclaimer.value = false
  set('disclaimer_agreed', '1')
  showTutorial.value = true
}

function declineDisclaimer() {
  showDisclaimer.value = false
  showDeclined.value = true
}

function closeTutorial() {
  showTutorial.value = false
  set('tutorial_done', '1')
  canSkipUsername.value = false
  showUsername.value = true
}

function closeUsername(saved) {
  showUsername.value = false
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 768
  if (!isMobile && !get('shortcuts_seen')) {
    showShortcuts.value = true
  }
}

function handleKeydown(e) {
  if (showDisclaimer.value || showUsername.value || showShortcuts.value || showTutorial.value) {
    return
  }

  const key = e.key.toLowerCase()

  if (key === 'enter' || e.code === 'Space') {
    e.preventDefault()
    if (screen.value === 'start' || screen.value === 'gameover') {
      if (ready.value) startGame()
    }
    return
  }

  if (key === 'escape') {
    e.preventDefault()
    if (screen.value === 'leaderboard') {
      handleLeaderboardBack()
    } else if (screen.value === 'gameover') {
      screen.value = 'start'
    }
    return
  }

  if (key === 'l') {
    e.preventDefault()
    if (screen.value === 'start' || screen.value === 'gameover') {
      screen.value = 'leaderboard'
    }
    return
  }

  if (key === 'u') {
    e.preventDefault()
    if (screen.value === 'start') {
      canSkipUsername.value = true
      showUsername.value = true
    }
    return
  }
}

function closeShortcuts() {
  showShortcuts.value = false
  set('shortcuts_seen', '1')
}

function goHome() {
  if (screen.value === 'playing') {
    quitGame()
    pauseBgm()
  } else {
    screen.value = 'start'
    pauseBgm()
  }
}

function handleLeaderboardBack() {
  screen.value = gameResult.value ? 'gameover' : 'start'
}
</script>
