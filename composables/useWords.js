export const useWords = () => {
  const words = useState('words', () => [])
  const currentLang = useState('currentLang', () => 'en')

  const filteredWords = computed(() =>
    words.value.filter(w => (w.lang || 'en') === currentLang.value)
  )

  const syncToServer = async () => {
    try {
      await $fetch('/api/words', { method: 'POST', body: words.value })
    } catch (e) {
      console.error('Sync failed:', e)
    }
  }

  const loadWords = async () => {
    try {
      const data = await $fetch('/api/words')
      if (Array.isArray(data) && data.length > 0) {
        words.value = data
      } else if (data && !Array.isArray(data) && typeof data === 'object') {
        const enWords = data['en-US'] || []
        const jaWords = data['ja-JP'] || []
        const migrated = [
          ...enWords.map(w => ({
            id: Math.random().toString(36).slice(2),
            english: w.word || '',
            ipa: w.ipa || '',
            vietnamese: '',
            lang: 'en',
            image: '',
            day: 1
          })),
          ...jaWords.map(w => ({
            id: Math.random().toString(36).slice(2),
            english: w.word || '',
            ipa: w.ipa || '',
            vietnamese: '',
            lang: 'ja',
            image: '',
            day: 1
          }))
        ].filter(w => w.english)
        if (migrated.length > 0) {
          words.value = migrated
          syncToServer()
        }
      }
    } catch (e) {
      console.error('Load failed:', e)
    }
  }

  return { words, filteredWords, currentLang, syncToServer, loadWords }
}
