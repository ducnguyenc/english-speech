<script setup>
import { ref, computed, watch } from 'vue'
import { Play, RotateCcw, ChevronRight, CheckCircle2, XCircle } from 'lucide-vue-next'

const { words, filteredWords, currentLang, syncToServer } = useWords()
const wordLabel = computed(() => currentLang.value === 'ja' ? 'Tiếng Nhật' : 'Tiếng Anh')

// ---- Settings ----
const settings = ref({
  days: [1, 2, 3, 4, 5],
  showEnglish: true,
  showIpa: true,
  showVietnamese: true,
  showImage: true,
  speakOnAppear: true,
  speakAfterSubmit: false,
  order: 'sequential',
  mode: 'practice'
})

const toggleDay = (d) => {
  const idx = settings.value.days.indexOf(d)
  if (idx === -1) settings.value.days.push(d)
  else if (settings.value.days.length > 1) settings.value.days.splice(idx, 1)
}

// ---- Practice state ----
const started = ref(false)
const queue = ref([])
const queueIdx = ref(0)
const englishInput = ref('')
const vietnameseInput = ref('')
const submitState = ref('idle') // 'idle' | 'correct' | 'wrong'
const score = ref({ correct: 0, wrong: 0 })
const finished = ref(false)

const currentWord = computed(() => queue.value[queueIdx.value] || null)
const progress = computed(() => queue.value.length ? `${queueIdx.value + 1} / ${queue.value.length}` : '')
const progressPct = computed(() => queue.value.length ? ((queueIdx.value) / queue.value.length) * 100 : 0)

const speak = (text) => {
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = currentLang.value === 'ja' ? 'ja-JP' : 'en-US'
  window.speechSynthesis.speak(u)
}

const startPractice = () => {
  let pool = filteredWords.value.filter(w => settings.value.days.includes(w.day))
  if (pool.length === 0) return

  if (settings.value.order === 'shuffle') {
    pool = [...pool].sort(() => Math.random() - 0.5)
  }

  queue.value = pool
  queueIdx.value = 0
  englishInput.value = ''
  vietnameseInput.value = ''
  submitState.value = 'idle'
  score.value = { correct: 0, wrong: 0 }
  finished.value = false
  started.value = true

  if (settings.value.speakOnAppear && pool[0]) {
    setTimeout(() => speak(pool[0].english), 300)
  }
}

const reset = () => {
  started.value = false
  finished.value = false
  queue.value = []
}

const checkAllMatch = () => {
  const word = currentWord.value
  if (!word) return false
  if (!settings.value.showEnglish) {
    if (englishInput.value.trim().toLowerCase() !== word.english.trim().toLowerCase()) return false
  }
  if (!settings.value.showVietnamese && word.vietnamese) {
    if (vietnameseInput.value.trim().toLowerCase() !== word.vietnamese.trim().toLowerCase()) return false
  }
  return true
}

const hasHiddenInput = computed(() =>
  !settings.value.showEnglish || (!settings.value.showVietnamese)
)

watch([englishInput, vietnameseInput], () => {
  if (submitState.value !== 'idle') return
  if (!hasHiddenInput.value) return
  if (checkAllMatch()) handleCorrect()
})

const handleCorrect = () => {
  submitState.value = 'correct'
  score.value.correct++

  const word = currentWord.value
  if (settings.value.speakAfterSubmit && word) speak(word.english)

  // Move word to next day
  const idx = words.value.findIndex(w => w.id === word.id)
  if (idx !== -1 && words.value[idx].day < 5) {
    words.value[idx].day++
    syncToServer()
  }

  setTimeout(advanceWord, 800)
}

const handleSubmit = () => {
  if (submitState.value === 'correct') return

  if (checkAllMatch()) {
    handleCorrect()
  } else {
    submitState.value = 'wrong'
    score.value.wrong++
    const word = currentWord.value
    if (settings.value.speakAfterSubmit && word) speak(word.english)

    if (settings.value.mode === 'real') {
      // In real mode: auto-advance after showing wrong
      setTimeout(advanceWord, 1500)
    }
    // In practice mode: stays, user can retry by clearing input
  }
}

const retryWord = () => {
  englishInput.value = ''
  vietnameseInput.value = ''
  submitState.value = 'idle'
}

const advanceWord = () => {
  if (queueIdx.value < queue.value.length - 1) {
    queueIdx.value++
    englishInput.value = ''
    vietnameseInput.value = ''
    submitState.value = 'idle'

    if (settings.value.speakOnAppear) {
      speak(queue.value[queueIdx.value].english)
    }
  } else {
    finished.value = true
  }
}
</script>

<template>
  <!-- FINISHED screen -->
  <div v-if="finished" class="glass-card finished-card">
    <div class="finished-icon">🎉</div>
    <h2>Hoàn thành!</h2>
    <div class="final-score">
      <div class="fs-item correct-item">
        <span class="fs-num">{{ score.correct }}</span>
        <span class="fs-label">Đúng</span>
      </div>
      <div class="fs-item wrong-item">
        <span class="fs-num">{{ score.wrong }}</span>
        <span class="fs-label">Sai</span>
      </div>
    </div>
    <p class="finished-note">Các từ đúng đã được chuyển sang ngày tiếp theo.</p>
    <div class="finished-actions">
      <button class="add-btn" @click="startPractice">Luyện lại</button>
      <button class="btn-outline" @click="reset">Về cài đặt</button>
    </div>
  </div>

  <!-- PRACTICE screen -->
  <div v-else-if="started" class="glass-card practice-mp">
    <!-- Progress -->
    <div class="mp-progress-row">
      <span class="mp-progress-text">{{ progress }}</span>
      <div class="mp-progress-bar">
        <div class="mp-progress-fill" :style="{ width: progressPct + '%' }" />
      </div>
      <button class="icon-btn-sm" @click="reset" title="Thoát"><RotateCcw :size="14" /></button>
    </div>

    <div v-if="currentWord" class="word-card" :class="submitState">
      <!-- Image -->
      <div v-if="settings.showImage && currentWord.image" class="mp-image">
        <img :src="currentWord.image" alt="" />
      </div>

      <!-- Word -->
      <div class="mp-field">
        <label class="mp-label">{{ wordLabel }}</label>
        <div v-if="settings.showEnglish" class="mp-display" :class="{ ja: currentLang === 'ja' }">{{ currentWord.english }}</div>
        <input
          v-else
          v-model="englishInput"
          class="mp-input"
          :class="submitState"
          :placeholder="`Nhập ${wordLabel.toLowerCase()}...`"
          :disabled="submitState === 'correct'"
          @keyup.enter="handleSubmit"
        />
      </div>

      <!-- IPA -->
      <div v-if="settings.showIpa" class="mp-field">
        <label class="mp-label">IPA</label>
        <div class="mp-ipa">/{{ currentWord.ipa }}/</div>
      </div>

      <!-- Vietnamese -->
      <div class="mp-field">
        <label class="mp-label">Tiếng Việt</label>
        <div v-if="settings.showVietnamese" class="mp-display viet">{{ currentWord.vietnamese || '—' }}</div>
        <input
          v-else
          v-model="vietnameseInput"
          class="mp-input"
          :class="submitState"
          placeholder="Nhập tiếng Việt..."
          :disabled="submitState === 'correct'"
          @keyup.enter="handleSubmit"
        />
      </div>

      <!-- Feedback icons -->
      <div v-if="submitState === 'correct'" class="mp-feedback correct">
        <CheckCircle2 :size="28" /> Đúng rồi!
      </div>
      <div v-else-if="submitState === 'wrong'" class="mp-feedback wrong">
        <XCircle :size="28" /> Sai rồi!
        <span v-if="settings.mode === 'practice'" class="retry-hint">{{ currentWord.english }}</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="mp-actions">
      <template v-if="submitState === 'wrong' && settings.mode === 'practice'">
        <button class="btn-outline" @click="retryWord">Thử lại</button>
        <button class="add-btn" @click="advanceWord">Bỏ qua <ChevronRight :size="16" /></button>
      </template>
      <template v-else-if="submitState !== 'correct'">
        <button v-if="hasHiddenInput" class="add-btn full" @click="handleSubmit">
          Kiểm tra
        </button>
        <button v-else class="add-btn full" @click="advanceWord">
          Tiếp theo <ChevronRight :size="16" />
        </button>
      </template>
    </div>
  </div>

  <!-- SETTINGS screen -->
  <div v-else class="glass-card settings-card">
    <h2 class="settings-title">Luyện ghi nhớ</h2>

    <!-- Day selection -->
    <div class="settings-section">
      <div class="settings-label">Chọn ngày luyện tập</div>
      <div class="day-checks">
        <button
          v-for="d in [1,2,3,4,5]" :key="d"
          :class="['day-check-btn', { active: settings.days.includes(d) }]"
          @click="toggleDay(d)"
        >
          Ngày {{ d }}
          <span class="day-count-sm">{{ filteredWords.filter(w => w.day === d).length }}</span>
        </button>
      </div>
    </div>

    <!-- Visibility toggles -->
    <div class="settings-section">
      <div class="settings-label">Hiển thị</div>
      <div class="toggle-grid">
        <label class="toggle-row">
          <input type="checkbox" v-model="settings.showEnglish" />
          <span class="toggle-track"><span class="toggle-thumb"/></span>
          {{ wordLabel }}
        </label>
        <label class="toggle-row">
          <input type="checkbox" v-model="settings.showIpa" />
          <span class="toggle-track"><span class="toggle-thumb"/></span>
          Phát âm IPA
        </label>
        <label class="toggle-row">
          <input type="checkbox" v-model="settings.showVietnamese" />
          <span class="toggle-track"><span class="toggle-thumb"/></span>
          Tiếng Việt
        </label>
        <label class="toggle-row">
          <input type="checkbox" v-model="settings.showImage" />
          <span class="toggle-track"><span class="toggle-thumb"/></span>
          Hình ảnh
        </label>
      </div>
    </div>

    <!-- Sound toggles -->
    <div class="settings-section">
      <div class="settings-label">Âm thanh</div>
      <div class="toggle-grid">
        <label class="toggle-row">
          <input type="checkbox" v-model="settings.speakOnAppear" />
          <span class="toggle-track"><span class="toggle-thumb"/></span>
          Đọc khi từ xuất hiện
        </label>
        <label class="toggle-row">
          <input type="checkbox" v-model="settings.speakAfterSubmit" />
          <span class="toggle-track"><span class="toggle-thumb"/></span>
          Đọc sau khi submit
        </label>
      </div>
    </div>

    <!-- Order -->
    <div class="settings-section">
      <div class="settings-label">Thứ tự</div>
      <div class="radio-group">
        <label class="radio-row">
          <input type="radio" v-model="settings.order" value="sequential" />
          <span class="radio-dot" />
          Theo thứ tự
        </label>
        <label class="radio-row">
          <input type="radio" v-model="settings.order" value="shuffle" />
          <span class="radio-dot" />
          Xáo trộn
        </label>
      </div>
    </div>

    <!-- Mode -->
    <div class="settings-section">
      <div class="settings-label">Chế độ</div>
      <div class="radio-group">
        <label class="radio-row">
          <input type="radio" v-model="settings.mode" value="practice" />
          <span class="radio-dot" />
          Luyện tập <span class="mode-hint">(có thể thử lại)</span>
        </label>
        <label class="radio-row">
          <input type="radio" v-model="settings.mode" value="real" />
          <span class="radio-dot" />
          Chơi thật <span class="mode-hint">(không thử lại)</span>
        </label>
      </div>
    </div>

    <!-- Count info -->
    <div class="word-count-info">
      <span>{{ filteredWords.filter(w => settings.days.includes(w.day)).length }} từ được chọn</span>
    </div>

    <button
      class="start-btn"
      @click="startPractice"
      :disabled="filteredWords.filter(w => settings.days.includes(w.day)).length === 0"
    >
      <Play :size="20" /> Bắt đầu
    </button>
  </div>
</template>

<style scoped>
/* Settings */
.settings-card { display: flex; flex-direction: column; gap: 1.2rem; }
.settings-title { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.2rem; }

.settings-section { display: flex; flex-direction: column; gap: 0.6rem; }
.settings-label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

.day-checks { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.day-check-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--text-muted);
  padding: 0.4rem 0.9rem;
  border-radius: 100px;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex; align-items: center; gap: 0.3rem;
  transition: all 0.2s;
  font-family: inherit;
}
.day-check-btn.active { background: var(--primary); color: white; border-color: var(--primary); }
.day-count-sm { background: rgba(255,255,255,0.2); border-radius: 100px; padding: 0 0.35rem; font-size: 0.65rem; }

.toggle-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.toggle-row {
  display: flex; align-items: center; gap: 0.6rem;
  cursor: pointer; font-size: 0.9rem; color: var(--text);
}
.toggle-row input { display: none; }
.toggle-track {
  width: 36px; height: 20px; background: rgba(255,255,255,0.1); border-radius: 100px;
  position: relative; transition: all 0.2s; flex-shrink: 0;
  border: 1px solid rgba(255,255,255,0.15);
}
.toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 14px; height: 14px; background: var(--text-muted);
  border-radius: 50%; transition: all 0.2s;
}
.toggle-row input:checked + .toggle-track { background: var(--primary); border-color: var(--primary); }
.toggle-row input:checked + .toggle-track .toggle-thumb { left: 18px; background: white; }

.radio-group { display: flex; flex-direction: column; gap: 0.5rem; }
.radio-row {
  display: flex; align-items: center; gap: 0.7rem;
  cursor: pointer; font-size: 0.9rem; color: var(--text);
}
.radio-row input { display: none; }
.radio-dot {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.2);
  flex-shrink: 0; transition: all 0.2s; position: relative;
}
.radio-row input:checked + .radio-dot {
  border-color: var(--primary);
  background: var(--primary);
  box-shadow: inset 0 0 0 3px var(--background);
}
.mode-hint { font-size: 0.75rem; color: var(--text-muted); }

.word-count-info { text-align: center; color: var(--text-muted); font-size: 0.85rem; }
.start-btn {
  background: var(--primary);
  color: white; border: none;
  padding: 1rem; border-radius: 16px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  gap: 0.6rem; font-size: 1.1rem; font-weight: 700;
  font-family: inherit; transition: all 0.2s;
  box-shadow: 0 4px 20px var(--primary-glow);
}
.start-btn:hover:not(:disabled) { transform: translateY(-2px); opacity: 0.9; }
.start-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Practice */
.practice-mp { display: flex; flex-direction: column; gap: 1.2rem; }

.mp-progress-row {
  display: flex; align-items: center; gap: 0.8rem;
}
.mp-progress-text { font-size: 0.85rem; color: var(--text-muted); white-space: nowrap; }
.mp-progress-bar {
  flex: 1; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden;
}
.mp-progress-fill { height: 100%; background: var(--primary); transition: width 0.4s ease; }
.icon-btn-sm {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  color: var(--text-muted); cursor: pointer; width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center; border-radius: 8px;
  transition: all 0.2s; flex-shrink: 0;
}
.icon-btn-sm:hover { background: rgba(255,255,255,0.12); color: var(--text); }

.word-card {
  background: rgba(255,255,255,0.03); border: 2px solid rgba(255,255,255,0.08);
  border-radius: 20px; padding: 1.5rem;
  display: flex; flex-direction: column; gap: 1rem;
  transition: border-color 0.3s;
}
.word-card.correct { border-color: rgba(34,197,94,0.4); }
.word-card.wrong { border-color: rgba(239,68,68,0.4); }

.mp-image img { width: 100%; max-height: 160px; object-fit: cover; border-radius: 12px; }
.mp-field { display: flex; flex-direction: column; gap: 0.4rem; }
.mp-label { font-size: 0.7rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.mp-display { font-size: 1.4rem; font-weight: 600; }
.mp-display.viet { color: var(--secondary); font-size: 1.1rem; }
.mp-display.ja { font-family: 'Noto Sans JP', sans-serif; }
.mp-ipa { font-family: 'JetBrains Mono', monospace; font-size: 1.1rem; color: var(--text-muted); }
.mp-input {
  background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15);
  border-radius: 12px; padding: 0.8rem 1rem;
  color: white; font-family: inherit; font-size: 1rem; transition: all 0.3s;
}
.mp-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-glow); }
.mp-input.correct { border-color: var(--success); background: rgba(34,197,94,0.1); }
.mp-input.wrong { border-color: var(--error); background: rgba(239,68,68,0.1); }
.mp-input:disabled { opacity: 0.7; }

.mp-feedback {
  display: flex; align-items: center; gap: 0.5rem;
  font-weight: 600; font-size: 1rem;
  padding: 0.6rem 0;
}
.mp-feedback.correct { color: var(--success); }
.mp-feedback.wrong { color: var(--error); flex-wrap: wrap; }
.retry-hint { font-size: 0.85rem; color: var(--text-muted); font-weight: 400; margin-left: 0.5rem; }

.mp-actions { display: flex; gap: 0.8rem; }
.add-btn {
  background: var(--primary); color: white; border: none;
  padding: 0.8rem 1.5rem; border-radius: 12px;
  cursor: pointer; display: flex; align-items: center; gap: 0.4rem;
  font-weight: 600; font-family: inherit; transition: all 0.2s;
}
.add-btn.full { flex: 1; justify-content: center; }
.add-btn:hover { opacity: 0.85; }
.btn-outline {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  color: var(--text); padding: 0.8rem 1.2rem; border-radius: 12px;
  cursor: pointer; display: flex; align-items: center; gap: 0.4rem;
  font-family: inherit; transition: all 0.2s;
}
.btn-outline:hover { background: rgba(255,255,255,0.1); }

/* Finished */
.finished-card { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1.2rem; }
.finished-icon { font-size: 3rem; }
.finished-card h2 { font-size: 1.8rem; font-weight: 700; }
.final-score { display: flex; gap: 3rem; }
.fs-item { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; }
.fs-num { font-size: 3rem; font-weight: 700; }
.correct-item .fs-num { color: var(--success); }
.wrong-item .fs-num { color: var(--error); }
.fs-label { font-size: 0.85rem; color: var(--text-muted); }
.finished-note { font-size: 0.85rem; color: var(--text-muted); }
.finished-actions { display: flex; gap: 0.8rem; width: 100%; }
.finished-actions .add-btn { flex: 1; justify-content: center; }
.finished-actions .btn-outline { flex: 1; justify-content: center; }
</style>
