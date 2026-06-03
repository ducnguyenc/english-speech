<script setup>
import { ref, onMounted } from 'vue'
import { Mic, BookOpen } from 'lucide-vue-next'

const mainTab = ref('speak')
const readTab = ref('manage')

const { loadWords, currentLang } = useWords()
onMounted(loadWords)
</script>

<template>
  <div class="app-container">
    <header class="header">
      <h1>IPA Mastery</h1>
      <p>Luyện phát âm chuẩn như người bản xứ</p>

      <!-- Language switcher -->
      <div class="lang-switcher">
        <button :class="['lang-btn', { active: currentLang === 'en' }]" @click="currentLang = 'en'">
          🇺🇸 Tiếng Anh
        </button>
        <button :class="['lang-btn', { active: currentLang === 'ja' }]" @click="currentLang = 'ja'">
          🇯🇵 Tiếng Nhật
        </button>
      </div>

      <!-- Main menu -->
      <nav class="main-nav">
        <button :class="['tab-btn', { active: mainTab === 'speak' }]" @click="mainTab = 'speak'">
          <Mic :size="16" /> Nói
        </button>
        <button :class="['tab-btn', { active: mainTab === 'read' }]" @click="mainTab = 'read'">
          <BookOpen :size="16" /> Đọc
        </button>
      </nav>

      <!-- Sub menu for Đọc -->
      <nav v-if="mainTab === 'read'" class="sub-nav">
        <button :class="['sub-tab-btn', { active: readTab === 'manage' }]" @click="readTab = 'manage'">
          Tạo màn mới
        </button>
        <button :class="['sub-tab-btn', { active: readTab === 'practice' }]" @click="readTab = 'practice'">
          Luyện ghi nhớ
        </button>
      </nav>
    </header>

    <SpeakView v-if="mainTab === 'speak'" />
    <template v-else>
      <WordManager v-if="readTab === 'manage'" />
      <MemoryPractice v-else />
    </template>
  </div>
</template>

<style scoped>
.lang-switcher {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
}
.lang-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--text-muted);
  padding: 0.45rem 1.1rem;
  border-radius: 100px;
  cursor: pointer;
  font-size: 0.85rem;
  font-family: inherit;
  transition: all 0.2s;
}
.lang-btn.active {
  background: rgba(6,182,212,0.2);
  color: var(--secondary);
  border-color: rgba(6,182,212,0.5);
}
.main-nav {
  display: flex;
  justify-content: center;
  gap: 0.8rem;
  margin-top: 1.2rem;
}

.sub-nav {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.8rem;
}

.sub-tab-btn {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: var(--text-muted);
  padding: 0.4rem 1rem;
  border-radius: 100px;
  cursor: pointer;
  font-size: 0.85rem;
  font-family: inherit;
  transition: all 0.2s;
}
.sub-tab-btn.active {
  background: rgba(139,92,246,0.2);
  color: var(--primary);
  border-color: rgba(139,92,246,0.4);
}
</style>
