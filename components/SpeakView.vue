<script setup>
import { ref, computed } from 'vue'
import { Mic, ChevronLeft, ChevronRight, Play, AlertCircle } from 'lucide-vue-next'
import { createPronunciationAssessment } from '~/utils/AzureSpeech'

const { filteredWords, currentLang } = useWords()

const currentIndex = ref(0)
const isRecording = ref(false)
const result = ref(null)
const loading = ref(false)
const error = ref(null)
const status = ref('idle')
const assessmentInstance = ref(null)

const currentWord = computed(() => filteredWords.value[currentIndex.value] || { english: 'No word', ipa: '-' })
const azureLang = computed(() => currentLang.value === 'ja' ? 'ja-JP' : 'en-US')

const statusMap = {
  idle: 'Sẵn sàng',
  connecting: 'Đang kết nối...',
  listening: 'Đang ghi âm...',
  analyzing: 'Đang phân tích...',
  done: 'Đã hoàn thành',
  error: 'Có lỗi xảy ra'
}

const getColor = (score) => score >= 80 ? 'correct' : score >= 50 ? 'partial' : 'incorrect'

const reset = () => {
  result.value = null
  status.value = 'idle'
  error.value = null
}

const handleNext = () => {
  currentIndex.value = (currentIndex.value + 1) % filteredWords.value.length
  reset()
}

const handleBack = () => {
  currentIndex.value = (currentIndex.value - 1 + filteredWords.value.length) % filteredWords.value.length
  reset()
}

const fetchToken = async () => $fetch('/api/azure-token')

const startCapturing = async () => {
  result.value = null
  error.value = null
  loading.value = true
  status.value = 'connecting'
  try {
    const { token, region } = await fetchToken()
    assessmentInstance.value = createPronunciationAssessment(
      token, region, currentWord.value.english, azureLang.value, (s) => status.value = s
    )
    await assessmentInstance.value.start()
    isRecording.value = true
  } catch (err) {
    error.value = 'Lỗi: ' + (err.message || 'Kiểm tra quyền micro.')
    loading.value = false
    status.value = 'error'
  }
}

const stopAndAssess = async () => {
  if (!assessmentInstance.value) return
  isRecording.value = false
  try {
    const data = await assessmentInstance.value.stop()
    if (data) {
      const phonemes = data.words.flatMap(w =>
        w.phonemes.map(p => ({ char: p.phoneme, score: p.score }))
      )
      const wordResults = data.words.map(w => ({ word: w.word, score: w.accuracyScore }))
      result.value = { ...data, phonemes, wordResults }
    } else {
      error.value = 'Không nhận diện được. Hãy thử lại.'
      status.value = 'error'
    }
  } catch (err) {
    error.value = String(err)
    status.value = 'error'
  } finally {
    loading.value = false
    assessmentInstance.value = null
  }
}

const handleMicClick = () => isRecording.value ? stopAndAssess() : startCapturing()
</script>

<template>
  <main v-if="filteredWords.length > 0" class="glass-card practice-card">
    <div class="word-scroll-container">
      <button class="nav-arrow left" @click="handleBack">
        <ChevronLeft :size="24" />
      </button>

      <div class="word-header">
        <div class="word-text-wrapper">
          <h2 :class="['target-word', { ja: currentLang === 'ja' }]">
            <template v-if="result && result.wordResults">
              <span v-for="(wr, i) in result.wordResults" :key="i" :class="getColor(wr.score)">
                {{ wr.word }}&nbsp;
              </span>
            </template>
            <template v-else>{{ currentWord.english }}</template>
          </h2>
        </div>

        <div v-if="currentWord.vietnamese" class="speak-viet">{{ currentWord.vietnamese }}</div>

        <div class="ipa-display">
          <div v-if="result && result.phonemes && result.phonemes.length > 0" class="phoneme-wrapper">
            <span v-for="(p, i) in result.phonemes" :key="i" class="phoneme" :class="getColor(p.score)">
              {{ p.char }}
            </span>
          </div>
          <span v-else class="ipa-text">/{{ currentWord.ipa }}/</span>
        </div>
      </div>

      <button class="nav-arrow right" @click="handleNext">
        <ChevronRight :size="24" />
      </button>
    </div>

    <div class="word-counter">{{ currentIndex + 1 }} / {{ filteredWords.length }}</div>

    <div class="status-tracker">
      <div class="status-bar">
        <div
          class="status-progress"
          :class="'phase-' + status"
          :style="{
            width: status === 'connecting' ? '25%' : status === 'listening' ? '50%' :
                   status === 'analyzing' ? '75%' : status === 'done' ? '100%' : '0%'
          }"
        />
      </div>
      <p class="status-text" :class="status">{{ statusMap[status] }}</p>
    </div>

    <div class="visualizer">
      <div v-if="isRecording" class="waveform">
        <div v-for="i in 12" :key="i" class="wave-bar" :style="{ animationDelay: (i * 0.1) + 's' }" />
      </div>
    </div>

    <div class="controls">
      <div v-if="error" class="error-msg">{{ error }}</div>
      <button class="mic-button" :class="{ recording: isRecording }" @click="handleMicClick" :disabled="loading && !isRecording">
        <Mic :size="32" />
      </button>
      <p class="hint">{{ isRecording ? 'Nhấn để kết thúc' : 'Nhấn để bắt đầu' }}</p>
    </div>

    <transition name="slide-up">
      <div v-if="result" class="result-inline glass-card">
        <div class="percentage-circle">
          <span class="overall-score">{{ result.overallScore }}</span>
          <span class="overall-label">% Accuracy</span>
        </div>
        <div class="score-container">
          <div class="score-item">
            <span class="score-value" :style="{ color: `var(--${getColor(result.accuracyScore)}-color)` }">{{ result.accuracyScore }}</span>
            <span class="score-label">Phát âm</span>
          </div>
          <div class="score-item">
            <span class="score-value" :style="{ color: `var(--${getColor(result.fluencyScore)}-color)` }">{{ result.fluencyScore }}</span>
            <span class="score-label">Lưu loát</span>
          </div>
          <div class="score-item">
            <span class="score-value" style="color: var(--success)">{{ result.completenessScore }}</span>
            <span class="score-label">Đầy đủ</span>
          </div>
        </div>
        <button class="action-button" @click="handleNext">Từ tiếp theo <Play :size="16" /></button>
      </div>
    </transition>
  </main>

  <main v-else class="glass-card">
    <div class="empty-state">
      <AlertCircle :size="48" />
      <p>Chưa có từ nào. Hãy thêm từ trong mục <strong>Đọc → Tạo màn mới</strong>.</p>
    </div>
  </main>
</template>

<style scoped>
.speak-viet {
  color: var(--text-muted);
  font-size: 1rem;
  margin-top: -0.5rem;
}
.word-counter {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.8rem;
}
.result-inline {
  text-align: center;
  margin-top: 0;
  padding: 1.5rem;
}
.wave-bar {
  width: 4px;
  height: 10px;
  background: var(--primary);
  border-radius: 2px;
  animation: wave 1s ease-in-out infinite;
}
@keyframes wave {
  0%, 100% { height: 10px; }
  50% { height: 40px; }
}
.error-msg {
  color: var(--error);
  font-size: 0.85rem;
}
.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.slide-up-enter-from, .slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
