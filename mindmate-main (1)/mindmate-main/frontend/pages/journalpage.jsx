import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { Save, Clock, FileText } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import api from '../api/client'

const EMOTION_COLORS = {
  anxious: '#fca5a5', hopeful: '#6ee7b7', frustrated: '#fbbf24',
  peaceful: '#a78bfa', sad: '#94a3b8', happy: '#6ee7b7',
  confused: '#fbbf24', grateful: '#6ee7b7', overwhelmed: '#fca5a5',
}

export default function JournalPage() {
  const [content, setContent] = useState('')
  const [entries, setEntries] = useState([])
  const [reflection, setReflection] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeEntry, setActiveEntry] = useState(null)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [autoSaveTimer, setAutoSaveTimer] = useState(null)

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  useEffect(() => {
    api.get('/api/journal').then(r => setEntries(r.data.data || [])).catch(() => {})
  }, [])

  // Auto-save after 2s of inactivity
  useEffect(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    if (!content.trim() || isReadOnly) return
    const t = setTimeout(() => {
      if (content.trim() && !activeEntry) return // only autosave existing entries
      if (activeEntry && content !== activeEntry.content) {
        handleSave(true)
      }
    }, 2000)
    setAutoSaveTimer(t)
    return () => clearTimeout(t)
  }, [content])

  const handleSave = async (silent = false) => {
    if (!content.trim()) return
    if (!silent) setSaving(true)
    try {
      let res
      if (activeEntry) {
        res = await api.put(`/api/journal/${activeEntry.id}`, { content })
      } else {
        res = await api.post('/api/journal', { content })
        setActiveEntry(res.data.data)
        setEntries(prev => [{ id: res.data.data.id, emotion_detected: res.data.data.emotion_detected, word_count: res.data.data.word_count, created_at: res.data.data.created_at, preview: content.slice(0, 100) }, ...prev])
      }
      if (res.data.data.ai_reflection) setReflection(res.data.data)
      if (!silent) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const loadEntry = async (entry) => {
    const res = await api.get(`/api/journal/${entry.id}`)
    setActiveEntry(res.data.data)
    setContent(res.data.data.content)
    setReflection(res.data.data.ai_reflection ? res.data.data : null)
    setIsReadOnly(false)
  }

  const newEntry = () => {
    setContent('')
    setActiveEntry(null)
    setReflection(null)
    setIsReadOnly(false)
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="mesh-bg" /><div className="noise" />
      <Sidebar />

      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col" style={{ borderRight: '1px solid var(--border)' }}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <h1 style={{ fontFamily: 'Playfair Display', fontSize: '22px', color: 'var(--text-primary)' }}>
                {activeEntry ? format(parseISO(activeEntry.created_at), 'EEEE, MMMM d') : format(new Date(), 'EEEE, MMMM d')}
              </h1>
              <div className="flex items-center gap-4 mt-1">
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{wordCount} words</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>~{readTime} min read</span>
                {saved && <span style={{ fontSize: '12px', color: 'var(--accent-green)' }}>Saved ✓</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={newEntry}
                className="px-4 py-2 rounded-xl text-sm transition-all hover:bg-white/5"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'DM Sans' }}
              >
                New entry
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={saving || !content.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: 'var(--accent-purple)', color: '#1a1d2e', fontFamily: 'DM Sans' }}
              >
                <Save size={15} />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Textarea */}
          <div className="flex-1 overflow-y-auto p-6">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Start writing — this is your private space. No judgment here. ✍️"
              className="w-full h-full outline-none journal-paper"
              style={{
                background: 'transparent',
                color: 'var(--text-primary)',
                fontFamily: 'DM Sans',
                fontSize: '15px',
                lineHeight: '32px',
                resize: 'none',
                border: 'none',
                minHeight: '400px',
              }}
              readOnly={isReadOnly}
            />
          </div>
        </div>

        {/* Right panel */}
        <div className="hidden lg:flex flex-col overflow-y-auto" style={{ width: '320px', minWidth: '320px' }}>
          {/* AI Reflection */}
          <div className="p-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '12px' }}>
              🔍 MindMate's reflection
            </h2>
            {wordCount < 50 && !reflection && (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.6' }}>
                Keep writing... reflection appears after 50 words. ({50 - wordCount} more to go)
              </p>
            )}
            <AnimatePresence>
              {reflection && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  {reflection.emotion_detected && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-3"
                      style={{
                        background: (EMOTION_COLORS[reflection.emotion_detected] || 'var(--accent-purple)') + '25',
                        color: EMOTION_COLORS[reflection.emotion_detected] || 'var(--accent-purple)',
                        border: `1px solid ${EMOTION_COLORS[reflection.emotion_detected] || 'var(--accent-purple)'}40`,
                      }}>
                      Feeling: {reflection.emotion_detected}
                    </div>
                  )}
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                    {reflection.ai_reflection}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Past entries */}
          <div className="flex-1 p-5 overflow-y-auto">
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '12px' }}>
              Past entries
            </h2>
            {entries.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Your entries will appear here.</p>
            ) : (
              entries.map(e => (
                <button
                  key={e.id}
                  onClick={() => loadEntry(e)}
                  className="w-full text-left p-3 rounded-xl mb-2 transition-all hover:bg-white/5 block"
                  style={{ border: '1px solid var(--border)', background: activeEntry?.id === e.id ? 'rgba(167,139,250,0.08)' : 'transparent' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {format(parseISO(e.created_at), 'MMM d')}
                    </span>
                    {e.emotion_detected && (
                      <span className="px-2 py-0.5 rounded-full text-xs"
                        style={{ background: (EMOTION_COLORS[e.emotion_detected] || '#a78bfa') + '20', color: EMOTION_COLORS[e.emotion_detected] || '#a78bfa' }}>
                        {e.emotion_detected}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    {e.preview}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{e.word_count} words</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}