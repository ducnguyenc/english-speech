<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { 
  Mic, Play, RotateCcw, CheckCircle2, AlertCircle, 
  ChevronLeft, ChevronRight, Settings, Plus, 
  Trash2, Edit3, Save, X, BookOpen 
} from 'lucide-vue-next'
import { createPronunciationAssessment } from '~/utils/AzureSpeech'

const DEFAULT_WORDS = {
    'en-US': [
        { word: 'Phenomenon', ipa: 'fɪˈnɒmɪnən' },
        { word: 'Architecture', ipa: 'ˈɑːkɪtektʃə' },
        { word: 'Authenticity', ipa: 'ˌɔːθenˈtɪsəti' },
    ],
    'ja-JP': [
        { word: 'こんにちは', ipa: 'kon-ni-chi-wa' },
        { word: 'ありがとうございます', ipa: 'a-ri-ga-tō' },
        { word: 'おやすみなさい', ipa: 'o-ya-su-mi' },
    ]
}

// State
const language = ref('en-US')
const allWords = ref(DEFAULT_WORDS)
const currentIndex = ref(0)
const isRecording = ref(false)
const result = ref(null)
const loading = ref(false)
const error = ref(null)
const status = ref('idle')
const view = ref('practice') // 'practice' or 'manage'

// Manage words state
const newWord = ref({ word: '', ipa: '' })
const editingIndex = ref(null)
const editWord = ref({ word: '', ipa: '' })

// Assessment Controller
const assessmentInstance = ref(null)

// Initialize from localStorage
onMounted(() => {
    const savedLang = localStorage.getItem('ipa-mastery-lang')
    if (savedLang) language.ref = savedLang
    
    const savedWords = localStorage.getItem('ipa-mastery-all-words')
    if (savedWords) allWords.value = JSON.parse(savedWords)
    
    const savedLastLang = localStorage.getItem('ipa-mastery-lang')
    if (savedLastLang) language.value = savedLastLang
})

// Persistence
watch(allWords, (val) => {
    localStorage.setItem('ipa-mastery-all-words', JSON.stringify(val))
}, { deep: true })

watch(language, (val) => {
    localStorage.setItem('ipa-mastery-lang', val)
})

// Computeds
const words = computed(() => allWords.value[language.value] || [])
const currentWord = computed(() => words.value[currentIndex.value] || { word: 'No word', ipa: '-' })

const statusMap = {
    idle: 'Sẵn sàng',
    connecting: 'Đang kết nối...',
    listening: 'Đang ghi âm...',
    analyzing: 'Đang phân tích...',
    done: 'Đã hoàn thành',
    error: 'Có lỗi xảy ra'
}

// Methods
const fetchToken = async () => {
    try {
        const data = await $fetch('/api/azure-token')
        return data
    } catch (err) {
        console.error('Failed to fetch token:', err)
        throw new Error('Không thể kết nối với máy chủ Azure. Kiểm tra key .env.')
    }
}

const startCapturing = async () => {
    result.value = null
    error.value = null
    loading.value = true
    status.value = 'connecting'

    try {
        const { token, region } = await fetchToken()
        
        assessmentInstance.value = createPronunciationAssessment(
            token,
            region,
            currentWord.value.word,
            language.value,
            (s) => status.value = s
        )

        await assessmentInstance.value.start()
        isRecording.value = true
    } catch (err) {
        console.error(err)
        error.value = 'Lỗi: ' + (err.message || 'Kiểm tra quyền truy cập micro.')
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
            displayResults(data)
        } else {
            error.value = 'Không nhận diện được giọng nói. Hãy thử lại.'
            status.value = 'error'
        }
    } catch (err) {
        console.error(err)
        error.value = err
        status.value = 'error'
    } finally {
        loading.value = false
        assessmentInstance.value = null
    }
}

const displayResults = (data) => {
    const allProcessedPhonemes = data.words.flatMap(wordData => {
        if (language.value === 'ja-JP') {
            const chars = wordData.word.split('')
            return wordData.syllables.map((s, i) => ({
                char: s.syllable || chars[i] || ' ',
                score: s.score
            }))
        }
        return wordData.phonemes.map(p => ({
            char: p.phoneme,
            score: p.score
        }))
    })

    const finalPhonemes = allProcessedPhonemes.filter(p => p.char.trim() || language.value === 'ja-JP')

    const wordResults = data.words.map(w => ({
        word: w.word,
        score: w.accuracyScore
    }))

    result.value = {
        ...data,
        phonemes: finalPhonemes,
        wordResults: wordResults
    }
}

const handleMicClick = () => {
    if (isRecording.value) {
        stopAndAssess()
    } else {
        startCapturing()
    }
}

const getColor = (score) => {
    if (score >= 80) return 'correct'
    if (score >= 50) return 'partial'
    return 'incorrect'
}

const handleNext = () => {
    currentIndex.value = (currentIndex.value + 1) % words.value.length
    result.value = null
    status.value = 'idle'
    error.value = null
}

const handleBack = () => {
    currentIndex.value = (currentIndex.value - 1 + words.value.length) % words.value.length
    result.value = null
    status.value = 'idle'
    error.value = null
}

const addNewWord = () => {
    if (newWord.value.word && newWord.value.ipa) {
        allWords.value[language.value].push({ ...newWord.value })
        newWord.value = { word: '', ipa: '' }
    }
}

const deleteWord = (index) => {
    allWords.value[language.value].splice(index, 1)
    if (currentIndex.value >= words.value.length && words.value.length > 0) {
        currentIndex.value = words.value.length - 1
    } else if (words.value.length === 0) {
        currentIndex.value = 0
    }
}

const startEditing = (index) => {
    editingIndex.value = index
    editWord.value = { ...words.value[index] }
}

const saveEdit = () => {
    allWords.value[language.value][editingIndex.value] = { ...editWord.value }
    editingIndex.value = null
}

const switchLanguage = (lang) => {
    language.value = lang
    currentIndex.value = 0
    result.value = null
    status.value = 'idle'
    error.value = null
}
</script>

<template>
  <div class="app-container">
    <header class="header">
      <div class="language-switcher">
        <button
          class="lang-btn"
          :class="{ active: language === 'en-US' }"
          @click="switchLanguage('en-US')"
        >
          English
        </button>
        <button
          class="lang-btn"
          :class="{ active: language === 'ja-JP' }"
          @click="switchLanguage('ja-JP')"
        >
          日本語
        </button>
      </div>
      <h1>IPA Mastery</h1>
      <p>
        {{ language === 'en-US' ? 'Luyện phát âm chuẩn như người bản xứ' : 'ネイティブのような発音を練習する' }}
      </p>
      
      <div class="nav-tabs">
        <button
          class="tab-btn"
          :class="{ active: view === 'practice' }"
          @click="view = 'practice'"
        >
          <BookOpen :size="18" /> Luyện tập
        </button>
        <button
          class="tab-btn"
          :class="{ active: view === 'manage' }"
          @click="view = 'manage'"
        >
          <Settings :size="18" /> Quản lý từ
        </button>
      </div>
    </header>

    <main v-if="view === 'practice'" class="glass-card practice-card">
      <template v-if="words.length > 0">
        <div class="word-scroll-container">
          <button class="nav-arrow left" @click="handleBack">
            <ChevronLeft :size="24" />
          </button>

          <div class="word-header">
            <div class="word-text-wrapper">
              <h2 class="target-word" :class="{ ja: language === 'ja-JP' }">
                <template v-if="result && result.wordResults">
                  <span 
                    v-for="(wr, i) in result.wordResults" 
                    :key="i" 
                    :class="getColor(wr.score)"
                  >
                    {{ wr.word }} 
                  </span>
                </template>
                <template v-else>
                  {{ currentWord.word }}
                </template>
              </h2>
            </div>

            <div class="ipa-display">
              <div v-if="result && result.phonemes && result.phonemes.length > 0" class="phoneme-wrapper">
                <span 
                  v-for="(p, i) in result.phonemes" 
                  :key="i" 
                  class="phoneme" 
                  :class="getColor(p.score)"
                >
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

        <div class="status-tracker">
            <div class="status-bar">
              <div
                class="status-progress"
                :class="'phase-' + status"
                :style="{
                  width: status === 'connecting' ? '25%' :
                         status === 'listening' ? '50%' :
                         status === 'analyzing' ? '75%' :
                         status === 'done' ? '100%' : '0%'
                }"
              ></div>
            </div>
            <p class="status-text" :class="status">{{ statusMap[status] }}</p>
        </div>

        <div class="visualizer">
          <div v-if="isRecording" class="waveform">
            <div 
              v-for="i in 12" 
              :key="i"
              class="wave-bar"
              :style="{ animationDelay: (i * 0.1) + 's' }"
            ></div>
          </div>
        </div>

        <div class="controls">
          <div v-if="error" class="error-msg">
            {{ error }}
          </div>
          <button
            class="mic-button"
            :class="{ recording: isRecording }"
            @click="handleMicClick"
            :disabled="loading && !isRecording"
          >
            <Mic :size="32" />
          </button>
          <p class="hint">
            {{ isRecording ? 'Nhấn để kết thúc' : 'Nhấn để bắt đầu' }}
          </p>
        </div>
      </template>

      <div v-else class="empty-state">
        <AlertCircle :size="48" />
        <p>Chưa có từ nào trong danh sách. Hãy thêm từ mới trong mục Quản lý.</p>
        <button class="tab-btn active" @click="view = 'manage'">
          Thêm từ ngay
        </button>
      </div>
    </main>

    <main v-else class="glass-card manage-card">
      <form class="add-word-form" @submit.prevent="addNewWord">
        <div class="input-group">
          <input
            type="text"
            :placeholder="language === 'en-US' ? 'Từ (ví dụ: Apple)' : '単語 (例: りんご)'"
            v-model="newWord.word"
            required
          />
          <input
            type="text"
            :placeholder="language === 'en-US' ? 'IPA (ví dụ: ˈæp.əl)' : '発音 (例: ri-n-go)'"
            v-model="newWord.ipa"
            required
          />
        </div>
        <button type="submit" class="add-btn">
          <Plus :size="20" /> {{ language === 'en-US' ? 'Thêm từ' : '単語を追加' }}
        </button>
      </form>

      <div class="word-list">
        <h3>{{ language === 'en-US' ? 'Danh sách từ' : '単語リスト' }} ({{ words.length }})</h3>
        <div class="scroll-area">
          <div v-for="(w, index) in words" :key="index" class="word-item">
            <div v-if="editingIndex === index" class="edit-mode">
              <input v-model="editWord.word" />
              <input v-model="editWord.ipa" />
              <div class="item-actions">
                <button @click="saveEdit" class="icon-btn save"><Save :size="18" /></button>
                <button @click="editingIndex = null" class="icon-btn cancel"><X :size="18" /></button>
              </div>
            </div>
            <template v-else>
              <div class="word-info" @click="currentIndex = index; view = 'practice'">
                <span class="w-text">{{ w.word }}</span>
                <span class="w-ipa">/{{ w.ipa }}/</span>
              </div>
              <div class="item-actions">
                <button @click="startEditing(index)" class="icon-btn edit"><Edit3 :size="18" /></button>
                <button @click="deleteWord(index)" class="icon-btn delete"><Trash2 :size="18" /></button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </main>

    <transition name="slide-up">
      <div v-if="result && view === 'practice'" class="glass-card result-card">
        <div class="percentage-circle">
          <span class="overall-score">{{ result.overallScore }}</span>
          <span class="overall-label">% Accuracy</span>
        </div>

        <div class="score-container">
          <div class="score-item">
            <span class="score-value" :style="{ color: getColor(result.accuracyScore) }">
              {{ result.accuracyScore }}
            </span>
            <span class="score-label">Phát âm</span>
          </div>
          <div class="score-item">
            <span class="score-value" :style="{ color: getColor(result.fluencyScore) }">
              {{ result.fluencyScore }}
            </span>
            <span class="score-label">Lưu loát</span>
          </div>
          <div class="score-item">
            <span class="score-value" style="color: var(--success)">
              {{ result.completenessScore }}
            </span>
            <span class="score-label">Đầy đủ</span>
          </div>
        </div>

        <button class="action-button next" @click="handleNext">
          {{ language === 'en-US' ? 'Từ tiếp theo' : '次の単語' }} <Play :size="16" />
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
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
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
}

/* Transitions */
.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.slide-up-enter-from, .slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
