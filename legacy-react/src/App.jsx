import React, { useState, useEffect, useRef } from 'react'
import { Mic, Play, RotateCcw, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Settings, Plus, Trash2, Edit3, Save, X, BookOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPronunciationAssessment } from './AzureSpeech'

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

function App() {
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('ipa-mastery-lang') || 'en-US'
    })
    const [allWords, setAllWords] = useState(() => {
        const saved = localStorage.getItem('ipa-mastery-all-words')
        return saved ? JSON.parse(saved) : DEFAULT_WORDS
    })
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isRecording, setIsRecording] = useState(false)
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [status, setStatus] = useState('idle')
    const [view, setView] = useState('practice') // 'practice' or 'manage'

    // Assessment Controller Ref
    const assessmentRef = useRef(null)

    // Manage words state
    const [newWord, setNewWord] = useState({ word: '', ipa: '' })
    const [editingIndex, setEditingIndex] = useState(null)
    const [editWord, setEditWord] = useState({ word: '', ipa: '' })

    useEffect(() => {
        localStorage.setItem('ipa-mastery-all-words', JSON.stringify(allWords))
    }, [allWords])

    useEffect(() => {
        localStorage.setItem('ipa-mastery-lang', language)
    }, [language])

    const words = allWords[language] || []
    const currentWord = words[currentIndex] || { word: 'No word', ipa: '-' }

    const statusMap = {
        idle: 'Sẵn sàng',
        listening: 'Đang ghi âm...',
        analyzing: 'Đang phân tích...',
        done: 'Đã hoàn thành',
        error: 'Có lỗi xảy ra'
    }

    const startCapturing = async () => {
        const key = import.meta.env.VITE_AZURE_SPEECH_KEY
        const region = import.meta.env.VITE_AZURE_SPEECH_REGION

        if (!key || key === 'YOUR_AZURE_SUBSCRIPTION_KEY') {
            setError('Bạn chưa nhập Key vào file .env!')
            return
        }

        setResult(null)
        setError(null)
        setLoading(true)

        try {
            assessmentRef.current = createPronunciationAssessment(
                key,
                region,
                currentWord.word,
                language,
                (s) => setStatus(s)
            )

            await assessmentRef.current.start()
            setIsRecording(true)
        } catch (err) {
            console.error(err)
            setError('Lỗi khởi động Micro: ' + (typeof err === 'string' ? err : 'Kiểm tra quyền truy cập.'))
            setLoading(false)
            setStatus('error')
        }
    }

    const stopAndAssess = async () => {
        if (!assessmentRef.current) return

        setIsRecording(false)
        try {
            const data = await assessmentRef.current.stop()
            if (data) {
                displayResults(data)
            }
        } catch (err) {
            console.error(err)
            setError(err)
            setStatus('error')
        } finally {
            setLoading(false)
            assessmentRef.current = null
        }
    }

    const displayResults = (data) => {
        const allProcessedPhonemes = data.words.flatMap(wordData => {
            if (language === 'ja-JP') {
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

        const finalPhonemes = allProcessedPhonemes.filter(p => p.char.trim() || language === 'ja-JP')

        const wordResults = data.words.map(w => ({
            word: w.word,
            score: w.accuracyScore
        }))

        setResult({
            ...data,
            phonemes: finalPhonemes,
            wordResults: wordResults
        })
    }

    const handleMicClick = () => {
        if (isRecording) {
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
        setCurrentIndex((currentIndex + 1) % words.length)
        setResult(null)
        setStatus('idle')
        setError(null)
    }

    const handleBack = () => {
        setCurrentIndex((currentIndex - 1 + words.length) % words.length)
        setResult(null)
        setStatus('idle')
        setError(null)
    }

    const addNewWord = (e) => {
        e.preventDefault()
        if (newWord.word && newWord.ipa) {
            const newAllWords = { ...allWords, [language]: [...words, newWord] }
            setAllWords(newAllWords)
            setNewWord({ word: '', ipa: '' })
        }
    }

    const deleteWord = (index) => {
        const newWords = words.filter((_, i) => i !== index)
        const newAllWords = { ...allWords, [language]: newWords }
        setAllWords(newAllWords)
        if (currentIndex >= newWords.length && newWords.length > 0) {
            setCurrentIndex(newWords.length - 1)
        } else if (newWords.length === 0) {
            setCurrentIndex(0)
        }
    }

    const startEditing = (index) => {
        setEditingIndex(index)
        setEditWord(words[index])
    }

    const saveEdit = () => {
        const newWords = [...words]
        newWords[editingIndex] = editWord
        const newAllWords = { ...allWords, [language]: newWords }
        setAllWords(newAllWords)
        setEditingIndex(null)
    }

    const switchLanguage = (lang) => {
        setLanguage(lang)
        setCurrentIndex(0)
        setResult(null)
        setStatus('idle')
        setError(null)
    }

    return (
        <div className="app-container">
            <header className="header">
                <div className="language-switcher">
                    <button
                        className={`lang-btn ${language === 'en-US' ? 'active' : ''}`}
                        onClick={() => switchLanguage('en-US')}
                    >
                        English
                    </button>
                    <button
                        className={`lang-btn ${language === 'ja-JP' ? 'active' : ''}`}
                        onClick={() => switchLanguage('ja-JP')}
                    >
                        日本語
                    </button>
                </div>
                <h1>IPA Mastery</h1>
                <p>{language === 'en-US' ? 'Luyện phát âm chuẩn như người bản xứ' : 'ネイティブのような発音を練習する'}</p>
                <div className="nav-tabs">
                    <button
                        className={`tab-btn ${view === 'practice' ? 'active' : ''}`}
                        onClick={() => setView('practice')}
                    >
                        <BookOpen size={18} /> Luyện tập
                    </button>
                    <button
                        className={`tab-btn ${view === 'manage' ? 'active' : ''}`}
                        onClick={() => setView('manage')}
                    >
                        <Settings size={18} /> Quản lý từ
                    </button>
                </div>
            </header>

            <AnimatePresence mode="wait">
                {view === 'practice' ? (
                    <motion.main
                        key="practice"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="glass-card practice-card"
                    >
                        {words.length > 0 ? (
                            <>
                                <div className="word-scroll-container">
                                    <button className="nav-arrow left" onClick={handleBack}>
                                        <ChevronLeft size={24} />
                                    </button>

                                    <div className="word-header">
                                        <div className="word-text-wrapper">
                                            <motion.h2
                                                className={`target-word ${language === 'ja-JP' ? 'ja' : ''}`}
                                                key={currentWord.word}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            >
                                                {result && result.wordResults ? (
                                                    result.wordResults.map((wr, i) => (
                                                        <span key={i} className={getColor(wr.score)}>
                                                            {wr.word}{' '}
                                                        </span>
                                                    ))
                                                ) : (
                                                    currentWord.word
                                                )}
                                            </motion.h2>
                                        </div>

                                        <div className="ipa-display">
                                            {result && result.phonemes && result.phonemes.length > 0 ? (
                                                <div className="phoneme-wrapper">
                                                    {result.phonemes.map((p, i) => (
                                                        <span key={i} className={`phoneme ${getColor(p.score)}`}>
                                                            {p.char}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="ipa-text">/{currentWord.ipa}/</span>
                                            )}
                                        </div>
                                    </div>

                                    <button className="nav-arrow right" onClick={handleNext}>
                                        <ChevronRight size={24} />
                                    </button>
                                </div>

                                <div className="status-tracker">
                                    <div className="status-bar">
                                        <div
                                            className={`status-progress phase-${status}`}
                                            style={{
                                                width: status === 'connecting' ? '25%' :
                                                    status === 'listening' ? '50%' :
                                                        status === 'analyzing' ? '75%' :
                                                            status === 'done' ? '100%' : '0%'
                                            }}
                                        ></div>
                                    </div>
                                    <p className={`status-text ${status}`}>{statusMap[status]}</p>
                                </div>

                                <div className="visualizer">
                                    {isRecording && (
                                        <motion.div
                                            className="waveform"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            {[...Array(12)].map((_, i) => (
                                                <motion.div
                                                    key={i}
                                                    animate={{ height: [10, 40, 10] }}
                                                    transition={{
                                                        repeat: Infinity,
                                                        duration: 0.5 + Math.random(),
                                                        delay: i * 0.05
                                                    }}
                                                    style={{
                                                        width: 4,
                                                        background: 'var(--primary)',
                                                        borderRadius: 2
                                                    }}
                                                />
                                            ))}
                                        </motion.div>
                                    )}
                                </div>

                                <div className="controls">
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            style={{ color: 'var(--error)', fontSize: '0.8rem', marginBottom: '0.5rem' }}
                                        >
                                            {error}
                                        </motion.div>
                                    )}
                                    <button
                                        className={`mic-button ${isRecording ? 'recording' : ''}`}
                                        onClick={handleMicClick}
                                        disabled={loading && !isRecording}
                                    >
                                        <Mic size={32} />
                                    </button>
                                    <p className="hint">
                                        {isRecording ? 'Nhấn để kết thúc' : 'Nhấn để bắt đầu'}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="empty-state">
                                <AlertCircle size={48} />
                                <p>Chưa có từ nào trong danh sách. Hãy thêm từ mới trong mục Quản lý.</p>
                                <button className="tab-btn active" onClick={() => setView('manage')}>
                                    Thêm từ ngay
                                </button>
                            </div>
                        )}
                    </motion.main>
                ) : (
                    <motion.main
                        key="manage"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="glass-card manage-card"
                    >
                        <form className="add-word-form" onSubmit={addNewWord}>
                            <div className="input-group">
                                <input
                                    type="text"
                                    placeholder={language === 'en-US' ? 'Từ (ví dụ: Apple)' : '単語 (例: りんご)'}
                                    value={newWord.word}
                                    onChange={e => setNewWord({ ...newWord, word: e.target.value })}
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder={language === 'en-US' ? 'IPA (ví dụ: ˈæp.əl)' : '発音 (例: ri-n-go)'}
                                    value={newWord.ipa}
                                    onChange={e => setNewWord({ ...newWord, ipa: e.target.value })}
                                    required
                                />
                            </div>
                            <button type="submit" className="add-btn">
                                <Plus size={20} /> {language === 'en-US' ? 'Thêm từ' : '単語を追加'}
                            </button>
                        </form>

                        <div className="word-list">
                            <h3>{language === 'en-US' ? 'Danh sách từ' : '単語リスト'} ({words.length})</h3>
                            <div className="scroll-area">
                                {words.map((w, index) => (
                                    <div key={index} className="word-item">
                                        {editingIndex === index ? (
                                            <div className="edit-mode">
                                                <input
                                                    value={editWord.word}
                                                    onChange={e => setEditWord({ ...editWord, word: e.target.value })}
                                                />
                                                <input
                                                    value={editWord.ipa}
                                                    onChange={e => setEditWord({ ...editWord, ipa: e.target.value })}
                                                />
                                                <div className="item-actions">
                                                    <button onClick={saveEdit} className="icon-btn save"><Save size={18} /></button>
                                                    <button onClick={() => setEditingIndex(null)} className="icon-btn cancel"><X size={18} /></button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="word-info" onClick={() => { setCurrentIndex(index); setView('practice'); }}>
                                                    <span className="w-text">{w.word}</span>
                                                    <span className="w-ipa">/{w.ipa}/</span>
                                                </div>
                                                <div className="item-actions">
                                                    <button onClick={() => startEditing(index)} className="icon-btn edit"><Edit3 size={18} /></button>
                                                    <button onClick={() => deleteWord(index)} className="icon-btn delete"><Trash2 size={18} /></button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.main>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {result && view === 'practice' && (
                    <motion.div
                        className="glass-card result-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                    >
                        <div className="percentage-circle">
                            <span className="overall-score">{result.overallScore}</span>
                            <span className="overall-label">% Accuracy</span>
                        </div>

                        <div className="score-container">
                            <div className="score-item">
                                <span className="score-value" style={{ color: getColor(result.accuracyScore) }}>
                                    {result.accuracyScore}
                                </span>
                                <span className="score-label">Phát âm</span>
                            </div>
                            <div className="score-item">
                                <span className="score-value" style={{ color: getColor(result.fluencyScore) }}>
                                    {result.fluencyScore}
                                </span>
                                <span className="score-label">Lưu loát</span>
                            </div>
                            <div className="score-item">
                                <span className="score-value" style={{ color: 'var(--success)' }}>
                                    {result.completenessScore}
                                </span>
                                <span className="score-label">Đầy đủ</span>
                            </div>
                        </div>

                        <button
                            className="action-button next"
                            onClick={handleNext}
                        >
                            {language === 'en-US' ? 'Từ tiếp theo' : '次の単語'} <Play size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx>{`
                .language-switcher {
                    display: flex;
                    justify-content: center;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }
                .lang-btn {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: var(--text-muted);
                    padding: 0.4rem 1rem;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.3s;
                }
                .lang-btn.active {
                    background: var(--secondary);
                    color: white;
                    border-color: var(--secondary);
                }
                .nav-tabs {
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    margin-top: 1.5rem;
                }
                .tab-btn {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: var(--text-muted);
                    padding: 0.6rem 1.2rem;
                    border-radius: 100px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: all 0.3s;
                    font-size: 0.9rem;
                    font-family: inherit;
                }
                .tab-btn.active {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                    box-shadow: 0 4px 12px var(--primary-glow);
                }
                .word-scroll-container {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 0.5rem;
                }
                .nav-arrow {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: var(--text);
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .nav-arrow:hover {
                    background: rgba(255,255,255,0.1);
                    transform: scale(1.1);
                }
                .manage-card {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }
                .add-word-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                input {
                    background: rgba(0,0,0,0.2);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    padding: 0.8rem 1rem;
                    color: white;
                    font-family: inherit;
                }
                input:focus {
                    outline: none;
                    border-color: var(--primary);
                }
                .add-btn {
                    background: var(--primary);
                    color: white;
                    border: none;
                    padding: 0.8rem;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    transition: all 0.2s;
                }
                .add-btn:hover {
                    filter: brightness(1.1);
                }
                .word-list h3 {
                    margin-bottom: 1rem;
                    font-size: 1.1rem;
                    color: var(--text-muted);
                }
                .scroll-area {
                    max-height: 300px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 0.8rem;
                    padding-right: 0.5rem;
                }
                .scroll-area::-webkit-scrollbar {
                    width: 4px;
                }
                .scroll-area::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 2px;
                }
                .word-item {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 12px;
                    padding: 1rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: all 0.2s;
                }
                .word-item:hover {
                    background: rgba(255,255,255,0.06);
                }
                .word-info {
                    flex: 1;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                }
                .w-text {
                    font-weight: 600;
                    font-size: 1.1rem;
                }
                .w-ipa {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    font-family: 'JetBrains Mono', monospace;
                }
                .item-actions {
                    display: flex;
                    gap: 0.5rem;
                }
                .icon-btn {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 0.4rem;
                    transition: all 0.2s;
                    border-radius: 8px;
                }
                .icon-btn:hover {
                    background: rgba(255,255,255,0.1);
                    color: var(--text);
                }
                .icon-btn.delete:hover { color: var(--error); }
                .icon-btn.save { color: var(--success); }
                
                .edit-mode {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    flex: 1;
                }
                .empty-state {
                    padding: 3rem 1rem;
                    text-align: center;
                    color: var(--text-muted);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                }

                .status-tracker {
                    margin-bottom: 1rem;
                    text-align: center;
                }
                .status-bar {
                    width: 100%;
                    height: 4px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 2px;
                    overflow: hidden;
                    margin-bottom: 0.5rem;
                }
                .status-progress {
                    height: 100%;
                    background: var(--primary);
                    transition: width 0.3s ease;
                }
                .status-progress.phase-error {
                    background: var(--error);
                }
                .status-text {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 500;
                }
                .status-text.listening { color: var(--secondary); }
                .status-text.analyzing { color: var(--warning); }
                .status-text.done { color: var(--success); }
                .status-text.error { color: var(--error); }

                .visualizer {
                  height: 60px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                .waveform {
                  display: flex;
                  gap: 4px;
                  align-items: center;
                }
                .action-button {
                  margin-top: 1.5rem;
                  width: 100%;
                  padding: 1rem;
                  border-radius: 12px;
                  border: none;
                  background: var(--text);
                  color: var(--background);
                  font-weight: 600;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 0.5rem;
                  cursor: pointer;
                  transition: all 0.2s;
                }
                .action-button:hover {
                  background: var(--primary);
                  color: white;
                }
            `}</style>
        </div>
    )
}

export default App

