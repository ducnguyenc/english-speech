<script setup>
import { ref, computed } from 'vue'
import { Plus, Edit3, Save, X, Trash2, Volume2, ChevronLeft, ChevronRight, ImageIcon, Upload, Download, FileDown } from 'lucide-vue-next'

const { words, filteredWords, currentLang, syncToServer } = useWords()

const selectedDay = ref('all')
const showForm = ref(false)
const newWord = ref({ english: '', ipa: '', vietnamese: '', image: '' })
const wordLabel = computed(() => currentLang.value === 'ja' ? 'Tiếng Nhật' : 'Tiếng Anh')
const editingId = ref(null)
const editWord = ref({})
const imageInputRef = ref(null)
const editImageInputRef = ref(null)

const days = ['all', 1, 2, 3, 4, 5]

const displayWords = computed(() =>
  selectedDay.value === 'all'
    ? filteredWords.value
    : filteredWords.value.filter(w => w.day === selectedDay.value)
)

const genId = () => Math.random().toString(36).slice(2)

const addWord = () => {
  if (!newWord.value.english.trim()) return
  words.value.push({ id: genId(), ...newWord.value, lang: currentLang.value, day: 1 })
  syncToServer()
  newWord.value = { english: '', ipa: '', vietnamese: '', image: '' }
  showForm.value = false
}

const deleteWord = (id) => {
  const idx = words.value.findIndex(w => w.id === id)
  if (idx !== -1) { words.value.splice(idx, 1); syncToServer() }
}

const startEdit = (word) => {
  editingId.value = word.id
  editWord.value = { ...word }
}

const saveEdit = () => {
  const idx = words.value.findIndex(w => w.id === editingId.value)
  if (idx !== -1) { words.value[idx] = { ...editWord.value }; syncToServer() }
  editingId.value = null
}

const movePrevDay = (word) => {
  if (word.day > 1) { word.day--; syncToServer() }
}

const moveNextDay = (word) => {
  if (word.day < 5) { word.day++; syncToServer() }
}

const speak = (text) => {
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  window.speechSynthesis.speak(u)
}

const handleImageUpload = (e, target) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => { target.image = ev.target.result }
  reader.readAsDataURL(file)
}

// Import / Export
const importInputRef = ref(null)

const SAMPLE_EN = [
  { english: 'Apple',       ipa: 'ˈæp.əl',           vietnamese: 'Táo',          day: 1 },
  { english: 'Beautiful',   ipa: 'ˈbjuː.tɪ.fəl',     vietnamese: 'Đẹp',          day: 1 },
  { english: 'Challenge',   ipa: 'ˈtʃæl.ɪndʒ',       vietnamese: 'Thử thách',    day: 1 },
  { english: 'Develop',     ipa: 'dɪˈvel.əp',         vietnamese: 'Phát triển',   day: 1 },
  { english: 'Environment', ipa: 'ɪnˈvaɪ.rən.mənt',  vietnamese: 'Môi trường',   day: 2 },
  { english: 'Frequency',   ipa: 'ˈfriː.kwən.si',     vietnamese: 'Tần số',       day: 2 },
  { english: 'Government',  ipa: 'ˈɡʌv.ən.mənt',      vietnamese: 'Chính phủ',    day: 2 },
  { english: 'Hospital',    ipa: 'ˈhɒs.pɪ.təl',       vietnamese: 'Bệnh viện',    day: 2 },
  { english: 'Important',   ipa: 'ɪmˈpɔː.tənt',       vietnamese: 'Quan trọng',   day: 3 },
  { english: 'Journey',     ipa: 'ˈdʒɜː.ni',           vietnamese: 'Hành trình',   day: 3 },
]

const SAMPLE_JA = [
  { english: 'ありがとう',       ipa: 'a-ri-ga-to-u',            vietnamese: 'Cảm ơn',            lang: 'ja', day: 1 },
  { english: 'こんにちは',       ipa: 'ko-n-ni-chi-wa',          vietnamese: 'Xin chào',           lang: 'ja', day: 1 },
  { english: 'すみません',       ipa: 'su-mi-ma-se-n',           vietnamese: 'Xin lỗi',            lang: 'ja', day: 1 },
  { english: 'おはようございます', ipa: 'o-ha-yo-u-go-za-i-ma-su', vietnamese: 'Chào buổi sáng',    lang: 'ja', day: 1 },
  { english: 'たべる',           ipa: 'ta-be-ru',                vietnamese: 'Ăn',                 lang: 'ja', day: 2 },
  { english: 'のむ',             ipa: 'no-mu',                   vietnamese: 'Uống',               lang: 'ja', day: 2 },
  { english: 'みる',             ipa: 'mi-ru',                   vietnamese: 'Xem / Nhìn',         lang: 'ja', day: 2 },
  { english: 'きく',             ipa: 'ki-ku',                   vietnamese: 'Nghe',               lang: 'ja', day: 2 },
  { english: 'がっこう',         ipa: 'ga-k-ko-u',               vietnamese: 'Trường học',         lang: 'ja', day: 3 },
  { english: 'でんしゃ',         ipa: 'de-n-sha',                vietnamese: 'Tàu điện',           lang: 'ja', day: 3 },
]

const downloadSample = () => {
  const sample = currentLang.value === 'ja' ? SAMPLE_JA : SAMPLE_EN
  const filename = currentLang.value === 'ja' ? 'sample-japanese.json' : 'sample-english.json'
  const a = document.createElement('a')
  a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sample, null, 2))
  a.download = filename
  a.click()
}

const exportJson = () => {
  const data = JSON.stringify(words.value, null, 2)
  const a = document.createElement('a')
  a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(data)
  a.download = 'ipa-words.json'
  a.click()
}

const handleImport = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const items = Array.isArray(data) ? data : (data['en-US'] || [])
    const imported = items.map(w => ({
      id: genId(),
      english: w.english || w.word || '',
      ipa: w.ipa || '',
      vietnamese: w.vietnamese || '',
      lang: w.lang || currentLang.value,
      image: w.image || '',
      day: w.day || 1
    })).filter(w => w.english)
    words.value.push(...imported)
    syncToServer()
    alert(`Đã import ${imported.length} từ.`)
  } catch {
    alert('File JSON không hợp lệ.')
  }
  e.target.value = ''
}
</script>

<template>
  <div class="wm-container">
    <!-- Day tabs -->
    <div class="day-tabs">
      <button
        v-for="d in days" :key="d"
        :class="['day-tab', { active: selectedDay === d }]"
        @click="selectedDay = d"
      >
        {{ d === 'all' ? 'Tất cả' : `Ngày ${d}` }}
        <span class="day-count">
          {{ d === 'all' ? filteredWords.length : filteredWords.filter(w => w.day === d).length }}
        </span>
      </button>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <button class="add-toggle-btn" @click="showForm = !showForm">
        <Plus :size="18" />
        {{ showForm ? 'Huỷ' : 'Tạo mới' }}
      </button>
      <div class="toolbar-right">
        <input ref="importInputRef" type="file" accept=".json" style="display:none" @change="handleImport" />
        <button class="btn-outline" @click="downloadSample" title="Tải file mẫu">
          <FileDown :size="16" /> Mẫu
        </button>
        <button class="btn-outline" @click="importInputRef.click()" title="Import JSON">
          <Upload :size="16" /> Import
        </button>
        <button class="btn-outline" @click="exportJson" title="Export JSON">
          <Download :size="16" /> Export
        </button>
      </div>
    </div>

    <!-- Add form -->
    <div v-if="showForm" class="add-form glass-card">
      <div class="form-grid">
        <div class="form-field">
          <label>{{ wordLabel }} *</label>
          <input v-model="newWord.english" :placeholder="currentLang === 'ja' ? 'e.g. りんご' : 'e.g. Apple'" @keyup.enter="addWord" />
        </div>
        <div class="form-field">
          <label>Phát âm IPA</label>
          <input v-model="newWord.ipa" placeholder="e.g. ˈæp.əl" />
        </div>
        <div class="form-field">
          <label>Tiếng Việt</label>
          <input v-model="newWord.vietnamese" placeholder="e.g. Táo" />
        </div>
        <div class="form-field">
          <label>Hình ảnh (URL)</label>
          <input v-model="newWord.image" placeholder="https://..." />
        </div>
        <div class="form-field">
          <label>Hoặc upload ảnh</label>
          <input ref="imageInputRef" type="file" accept="image/*" style="display:none" @change="e => handleImageUpload(e, newWord)" />
          <button class="btn-outline" @click="imageInputRef.click()">
            <ImageIcon :size="16" /> Chọn ảnh
          </button>
        </div>
        <div v-if="newWord.image" class="img-preview">
          <img :src="newWord.image" alt="preview" />
        </div>
      </div>
      <button class="add-btn" @click="addWord">
        <Plus :size="18" /> Thêm vào Ngày 1
      </button>
    </div>

    <!-- Word list -->
    <div class="wm-list">
      <div v-if="displayWords.length === 0" class="empty-state">
        <p>Không có từ nào{{ selectedDay !== 'all' ? ` ở Ngày ${selectedDay}` : '' }}.</p>
      </div>

      <div v-for="word in displayWords" :key="word.id" class="wm-item">
        <!-- Edit mode -->
        <template v-if="editingId === word.id">
          <div class="edit-form">
            <input v-model="editWord.english" :placeholder="wordLabel" />
            <input v-model="editWord.ipa" placeholder="IPA" />
            <input v-model="editWord.vietnamese" placeholder="Tiếng Việt" />
            <input v-model="editWord.image" placeholder="URL ảnh" />
            <input ref="editImageInputRef" type="file" accept="image/*" style="display:none" @change="e => handleImageUpload(e, editWord)" />
            <div class="edit-actions">
              <button class="btn-outline sm" @click="editImageInputRef.click()"><ImageIcon :size="14" /></button>
              <button class="icon-btn save" @click="saveEdit"><Save :size="16" /></button>
              <button class="icon-btn cancel" @click="editingId = null"><X :size="16" /></button>
            </div>
          </div>
        </template>

        <!-- View mode -->
        <template v-else>
          <div class="wm-item-content">
            <img v-if="word.image" :src="word.image" class="wm-thumb" alt="" />
            <div class="wm-info">
              <div class="wm-english">{{ word.english }}</div>
              <div v-if="word.ipa" class="wm-ipa">/{{ word.ipa }}/</div>
              <div v-if="word.vietnamese" class="wm-viet">{{ word.vietnamese }}</div>
            </div>
          </div>

          <div class="wm-actions">
            <div class="day-badge-row">
              <button class="icon-btn sm" @click="movePrevDay(word)" :disabled="word.day <= 1" title="Ngày trước">
                <ChevronLeft :size="14" />
              </button>
              <span class="day-badge">N{{ word.day }}</span>
              <button class="icon-btn sm" @click="moveNextDay(word)" :disabled="word.day >= 5" title="Ngày sau">
                <ChevronRight :size="14" />
              </button>
            </div>
            <button class="icon-btn speak" @click="speak(word.english)" title="Nghe phát âm"><Volume2 :size="16" /></button>
            <button class="icon-btn edit" @click="startEdit(word)"><Edit3 :size="16" /></button>
            <button class="icon-btn delete" @click="deleteWord(word.id)"><Trash2 :size="16" /></button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wm-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.day-tabs {
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  padding-bottom: 0.2rem;
  scrollbar-width: none;
}
.day-tabs::-webkit-scrollbar { display: none; }

.day-tab {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--text-muted);
  padding: 0.4rem 0.8rem;
  border-radius: 100px;
  cursor: pointer;
  font-size: 0.8rem;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s;
  font-family: inherit;
}
.day-tab.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
.day-count {
  background: rgba(255,255,255,0.15);
  border-radius: 100px;
  padding: 0 0.4rem;
  font-size: 0.7rem;
}
.day-tab.active .day-count {
  background: rgba(255,255,255,0.25);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.toolbar-right {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}

.add-toggle-btn {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.7rem 1.5rem;
  border-radius: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.95rem;
  font-family: inherit;
  transition: all 0.2s;
  align-self: flex-start;
}
.add-toggle-btn:hover { opacity: 0.85; transform: translateY(-1px); }

.add-form {
  padding: 1.5rem;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
  margin-bottom: 1rem;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.form-field label {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 500;
}
.img-preview { grid-column: span 2; }
.img-preview img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
}

.wm-list {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  max-height: 60vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--primary) transparent;
}

.wm-item {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
  transition: all 0.2s;
}
.wm-item:hover {
  background: rgba(255,255,255,0.07);
  border-color: rgba(255,255,255,0.15);
}

.wm-item-content {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex: 1;
  min-width: 0;
}
.wm-thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}
.wm-info { min-width: 0; }
.wm-english { font-weight: 600; font-size: 1.1rem; truncate: true; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.wm-ipa { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--text-muted); }
.wm-viet { font-size: 0.85rem; color: var(--secondary); margin-top: 0.1rem; }

.wm-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}
.day-badge-row {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}
.day-badge {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--primary);
  min-width: 20px;
  text-align: center;
}

.icon-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  color: var(--text-muted);
  cursor: pointer;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  transition: all 0.2s;
}
.icon-btn.sm { width: 24px; height: 24px; border-radius: 6px; }
.icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.icon-btn:hover:not(:disabled) { background: rgba(255,255,255,0.12); color: var(--text); }
.icon-btn.speak:hover { background: rgba(6,182,212,0.15); color: var(--secondary); border-color: rgba(6,182,212,0.3); }
.icon-btn.edit:hover { background: rgba(139,92,246,0.15); color: var(--primary); border-color: rgba(139,92,246,0.3); }
.icon-btn.delete:hover { background: rgba(239,68,68,0.15); color: var(--error); border-color: rgba(239,68,68,0.3); }
.icon-btn.save { background: rgba(34,197,94,0.1); color: var(--success); border-color: rgba(34,197,94,0.2); }
.icon-btn.cancel { background: rgba(239,68,68,0.1); color: var(--error); border-color: rgba(239,68,68,0.2); }

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}
.edit-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.btn-outline {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--text);
  padding: 0.5rem 1rem;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-family: inherit;
  transition: all 0.2s;
}
.btn-outline.sm { padding: 0.3rem 0.6rem; font-size: 0.75rem; }
.btn-outline:hover { background: rgba(255,255,255,0.1); }

.add-btn {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.8rem;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 600;
  font-family: inherit;
  width: 100%;
  transition: all 0.2s;
}
.add-btn:hover { opacity: 0.85; transform: translateY(-1px); }

.empty-state {
  text-align: center;
  color: var(--text-muted);
  padding: 3rem 1rem;
}
</style>
