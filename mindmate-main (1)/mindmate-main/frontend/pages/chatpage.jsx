import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Wind, Leaf, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import CrisisBanner from '../components/CrisisBanner'
import api from '../api/client'

const QUICK_REPLIES = [
  { text: "I'm feeling anxious 😟", emoji: '😟' },
  { text: "I'm feeling sad 😢", emoji: '😢' },
  { text: "I'm doing okay 🙂", emoji: '🙂' },
  { text: "I just want to vent 💬", emoji: '💬' },
]

const CBT_SHORTCUTS = [
  { label: 'Breathing exercise 🌬️', prompt: 'Guide me through a breathing exercise to feel calmer.' },
  { label: 'Ground me (5-4-3-2-1) 🌿', prompt: 'Guide me through the 5-4-3-2-1 grounding technique.' },
  { label: 'Positive affirmation ✨', prompt: 'Give me a positive affirmation that feels genuine and comforting.' },
]

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 p-3 msg-ai" style={{ width: 80 }}>
      {[0,1,2].map(i => (
        <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  )
}

function Message({ msg }) {
  const isAI = msg.role === 'assistant'
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isAI ? 'justify-start' : 'justify-end'} mb-4`}
    >
      {isAI && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center mr-2 shrink-0 mt-1"
          style={{ background: 'rgba(167,139,250,0.2)', fontSize: '14px' }}
        >
          🧠
        </div>
      )}
      <div>
        <div className={isAI ? 'msg-ai px-4 py-3' : 'msg-user px-4 py-3'}>
          <p style={{ color: 'var(--text-primary)', fontFamily: 'DM Sans', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {msg.content}
          </p>
        </div>
        <p className="text-xs mt-1 px-1" style={{ color: 'var(--text-muted)', textAlign: isAI ? 'left' : 'right' }}>
          {msg.created_at ? format(new Date(msg.created_at), 'h:mm a') : ''}
        </p>
      </div>
    </motion.div>
  )
}

export default function ChatPage() {
  const { user } = useAuth()
  const [chats, setChats] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [showCBT, setShowCBT] = useState(false)
  const [crisisVisible, setCrisisVisible] = useState(false)
  const [moodToday, setMoodToday] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  // Load chats and today's mood on mount
  useEffect(() => {
    api.get('/api/chats').then(r => setChats(r.data.data || []))
    api.get('/api/mood?range=1').then(r => {
      const logs = r.data.data || []
      if (logs.length > 0) setMoodToday(logs[logs.length - 1])
    }).catch(() => {})
  }, [])

  // Load messages when chat changes
  useEffect(() => {
    if (!activeChatId) return
    api.get(`/api/chats/${activeChatId}/messages`).then(r => {
      setMessages(r.data.data || [])
    })
  }, [activeChatId])

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const sendMessage = useCallback(async (text) => {
    const content = text || input.trim()
    if (!content || isStreaming) return

    // Create chat if none active
    let chatId = activeChatId
    if (!chatId) {
      const res = await api.post('/api/chats')
      chatId = res.data.data.id
      setActiveChatId(chatId)
      setChats(prev => [res.data.data, ...prev])
    }

    const userMsg = { id: Date.now(), role: 'user', content, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsStreaming(true)
    setStreamingText('')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'crisis' && data.crisis) {
              setCrisisVisible(true)
            } else if (data.type === 'chunk') {
              accumulated += data.text
              setStreamingText(accumulated)
            } else if (data.type === 'done') {
              setMessages(prev => [...prev, {
                id: data.message_id,
                role: 'assistant',
                content: accumulated,
                created_at: new Date().toISOString(),
              }])
              setStreamingText('')
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error('Stream error', err)
    } finally {
      setIsStreaming(false)
      setStreamingText('')
      inputRef.current?.focus()
    }
  }, [input, activeChatId, isStreaming])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isNewChat = messages.length === 0

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="noise" />
      <div className="mesh-bg" />

      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={(c) => {
          setChats(prev => [c, ...prev])
          setActiveChatId(c.id)
          setMessages([])
        }}
        onSelectChat={(c) => {
          setActiveChatId(c.id)
          setMessages([])
        }}
      />

      {/* Center */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Crisis banner */}
        <CrisisBanner visible={crisisVisible} onDismiss={() => setCrisisVisible(false)} />

        {/* Top bar */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'rgba(26,29,46,0.8)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center gap-3">
            <div className="pulse-dot" />
            <div>
              <h1 style={{ fontFamily: 'Playfair Display', fontSize: '18px', color: 'var(--text-primary)' }}>
                MindMate
              </h1>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {format(new Date(), 'EEEE, MMMM d')} · Hi, {user?.name?.split(' ')[0]}
              </p>
            </div>
          </div>
          {moodToday ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(110,231,183,0.1)', border: '1px solid rgba(110,231,183,0.2)' }}>
              <span style={{ fontSize: '16px' }}>
                {{ great: '😄', good: '😊', okay: '😐', low: '😟', struggling: '😢' }[moodToday.mood] || ''}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--accent-green)' }}>
                Mood: {moodToday.score}/10
              </span>
            </div>
          ) : (
            <a href="/mood" style={{ fontSize: '13px', color: 'var(--accent-purple)', textDecoration: 'none' }}>
              Log today's mood →
            </a>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6" style={{ maxWidth: '760px', width: '100%', margin: '0 auto' }}>
          {isNewChat ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧠</div>
              <h2 style={{ fontFamily: 'Playfair Display', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Welcome back, {user?.name?.split(' ')[0]}
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
                This is a safe space — you can share anything on your mind. How are you feeling today?
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                {QUICK_REPLIES.map(qr => (
                  <button
                    key={qr.text}
                    onClick={() => sendMessage(qr.text)}
                    className="px-4 py-2.5 rounded-xl text-sm transition-all hover:scale-105"
                    style={{
                      background: 'rgba(167,139,250,0.1)',
                      border: '1px solid rgba(167,139,250,0.2)',
                      color: 'var(--text-primary)',
                      fontFamily: 'DM Sans',
                    }}
                  >
                    {qr.text}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {messages.map(msg => <Message key={msg.id} msg={msg} />)}
              {isStreaming && streamingText && (
                <div className="flex justify-start mb-4">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center mr-2 shrink-0 mt-1" style={{ background: 'rgba(167,139,250,0.2)', fontSize: '14px' }}>🧠</div>
                  <div className="msg-ai px-4 py-3">
                    <p style={{ color: 'var(--text-primary)', fontFamily: 'DM Sans', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {streamingText}
                    </p>
                  </div>
                </div>
              )}
              {isStreaming && !streamingText && (
                <div className="flex justify-start mb-4">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center mr-2 shrink-0 mt-1" style={{ background: 'rgba(167,139,250,0.2)', fontSize: '14px' }}>🧠</div>
                  <TypingIndicator />
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div
          className="px-6 py-4 shrink-0"
          style={{ borderTop: '1px solid var(--border)', background: 'rgba(26,29,46,0.8)', backdropFilter: 'blur(12px)' }}
        >
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            {/* CBT shortcuts */}
            <AnimatePresence>
              {showCBT && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex gap-2 mb-3 overflow-hidden"
                >
                  {CBT_SHORTCUTS.map(s => (
                    <button
                      key={s.label}
                      onClick={() => sendMessage(s.prompt)}
                      className="px-3 py-1.5 rounded-xl text-xs transition-all hover:opacity-80 whitespace-nowrap"
                      style={{ background: 'rgba(110,231,183,0.1)', border: '1px solid rgba(110,231,183,0.2)', color: 'var(--accent-green)', fontFamily: 'DM Sans' }}
                    >
                      {s.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-3">
              <button
                onClick={() => setShowCBT(v => !v)}
                className="p-2.5 rounded-xl shrink-0 transition-all hover:bg-white/5"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                title="CBT techniques"
              >
                {showCBT ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Share what's on your mind..."
                  rows={1}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontFamily: 'DM Sans',
                    lineHeight: '1.5',
                  }}
                  disabled={isStreaming}
                />
                {input.length > 100 && (
                  <span
                    className="absolute bottom-2 right-3 text-xs"
                    style={{ color: input.length > 500 ? 'var(--accent-coral)' : 'var(--text-muted)' }}
                  >
                    {input.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isStreaming}
                className="p-3 rounded-xl shrink-0 transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: 'var(--accent-purple)', color: '#1a1d2e' }}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div
        className="hidden xl:flex flex-col"
        style={{
          width: '280px',
          minWidth: '280px',
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border)',
          overflowY: 'auto',
        }}
      >
        <RightSidebar />
      </div>
    </div>
  )
}

// Right sidebar — mood card + CBT techniques + resources
function RightSidebar() {
  const [moodLogs, setMoodLogs] = useState([])
  const [openCBT, setOpenCBT] = useState(null)

  useEffect(() => {
    api.get('/api/mood?range=7').then(r => setMoodLogs(r.data.data || [])).catch(() => {})
  }, [])

  const cbtItems = [
    {
      title: 'Breathing (4-7-8)',
      content: 'Inhale for 4 counts → Hold for 7 counts → Exhale for 8 counts. Repeat 3-4 times. This activates your parasympathetic nervous system.',
    },
    {
      title: 'Grounding (5-4-3-2-1)',
      content: '5 things you see → 4 you can touch → 3 you hear → 2 you smell → 1 you taste. Brings you back to the present moment.',
    },
    {
      title: 'Thought Reframing',
      content: 'Notice the thought → ask "Is this fact or feeling?" → write the evidence for and against → create a balanced thought.',
    },
    {
      title: 'Progressive Muscle Relaxation',
      content: 'Starting from your feet, tense each muscle group for 5 seconds then release. Work up through your body to your face.',
    },
  ]

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Mood card */}
      <div className="glass-card-solid p-4">
        <h3 style={{ fontFamily: 'Playfair Display', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '12px' }}>
          Your week
        </h3>
        {moodLogs.length === 0 ? (
          <div className="text-center py-4">
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No mood logs yet</p>
            <a href="/mood" style={{ color: 'var(--accent-purple)', fontSize: '13px' }}>Log your mood →</a>
          </div>
        ) : (
          <div className="flex gap-1 items-end h-12">
            {moodLogs.slice(-7).map((log, i) => (
              <div key={i} title={`${log.mood}: ${log.score}/10`} className="flex-1 rounded-sm transition-all" style={{ height: `${(log.score / 10) * 100}%`, background: log.score >= 7 ? 'var(--accent-green)' : log.score >= 4 ? 'var(--accent-purple)' : 'var(--accent-coral)', opacity: 0.8 }} />
            ))}
          </div>
        )}
      </div>

      {/* CBT techniques */}
      <div className="glass-card-solid p-4">
        <h3 style={{ fontFamily: 'Playfair Display', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '12px' }}>
          CBT Techniques
        </h3>
        {cbtItems.map((item, i) => (
          <div key={i} className="mb-2">
            <button
              onClick={() => setOpenCBT(openCBT === i ? null : i)}
              className="w-full flex items-center justify-between py-2 text-sm transition-colors"
              style={{ color: openCBT === i ? 'var(--accent-purple)' : 'var(--text-muted)', fontFamily: 'DM Sans' }}
            >
              {item.title}
              <span>{openCBT === i ? '−' : '+'}</span>
            </button>
            <AnimatePresence>
              {openCBT === i && (
                <motion.p
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ color: 'var(--text-muted)', fontSize: '12px', lineHeight: '1.6', paddingBottom: '8px', overflow: 'hidden' }}
                >
                  {item.content}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Resources */}
      <div className="glass-card-solid p-4">
        <h3 style={{ fontFamily: 'Playfair Display', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '12px' }}>
          Helpful resources
        </h3>
        {[
          { name: 'iCall', url: 'tel:9152987821', desc: '9152987821' },
          { name: 'Vandrevala', url: 'tel:18602662345', desc: '1860-2662-345' },
          { name: 'YourDost', url: 'https://yourdost.com', desc: 'yourdost.com' },
          { name: 'Snehi', url: 'tel:04424640050', desc: '044-24640050' },
        ].map(r => (
          <a key={r.name} href={r.url} target="_blank" rel="noreferrer"
            className="flex items-center justify-between py-2 text-sm border-b last:border-0 transition-opacity hover:opacity-70"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', fontFamily: 'DM Sans', textDecoration: 'none' }}
          >
            <span style={{ color: 'var(--text-primary)' }}>{r.name}</span>
            <span style={{ fontSize: '12px' }}>{r.desc}</span>
          </a>
        ))}
      </div>
    </div>
  )
}