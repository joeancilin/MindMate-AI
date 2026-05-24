import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { format, parseISO, startOfMonth, eachDayOfInterval, endOfMonth } from 'date-fns'
import Sidebar from '../components/Sidebar'
import api from '../api/client'

const MOODS = [
  { key: 'great',      emoji: '😄', label: 'Great',      color: '#6ee7b7', score: 9 },
  { key: 'good',       emoji: '😊', label: 'Good',       color: '#a78bfa', score: 7 },
  { key: 'okay',       emoji: '😐', label: 'Okay',       color: '#94a3b8', score: 5 },
  { key: 'low',        emoji: '😟', label: 'Low',        color: '#fbbf24', score: 3 },
  { key: 'struggling', emoji: '😢', label: 'Struggling', color: '#fca5a5', score: 1 },
]

const MOOD_COLORS = {
  great: '#6ee7b7', good: '#a78bfa', okay: '#94a3b8', low: '#fbbf24', struggling: '#fca5a5'
}

export default function MoodPage() {
  const [selectedMood, setSelectedMood] = useState(null)
  const [intensity, setIntensity] = useState(5)
  const [note, setNote] = useState('')
  const [logs, setLogs] = useState([])
  const [insight, setInsight] = useState('')
  const [logged, setLogged] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/mood?range=30'),
      api.get('/api/mood/insights'),
    ]).then(([moodRes, insightRes]) => {
      setLogs(moodRes.data.data || [])
      setInsight(insightRes.data.data?.insight || '')
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleLog = async () => {
    if (!selectedMood) return
    try {
      const res = await api.post('/api/mood', {
        mood: selectedMood,
        score: intensity,
        note,
      })
      setLogs(prev => [...prev, res.data.data])
      setLogged(true)
      setTimeout(() => setLogged(false), 3000)
      setSelectedMood(null); setNote('')
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to log mood')
    }
  }

  // Calendar heatmap
  const today = new Date()
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const logsByDate = {}
  logs.forEach(l => {
    const d = l.logged_at.split('T')[0]
    logsByDate[d] = l
  })

  // Chart data
  const chartData = logs.map(l => ({
    date: format(parseISO(l.logged_at), 'MMM d'),
    score: l.score,
    mood: l.mood,
  }))

  // Pie data
  const moodCounts = {}
  logs.forEach(l => { moodCounts[l.mood] = (moodCounts[l.mood] || 0) + 1 })
  const pieData = Object.entries(moodCounts).map(([mood, count]) => ({
    name: mood,
    value: count,
    color: MOOD_COLORS[mood],
  }))

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="mesh-bg" /><div className="noise" />
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-6 py-8" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Playfair Display', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '8px' }}>
          Mood Tracker
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Track how you feel every day.</p>

        {/* Check-in card */}
        <div className="glass-card-solid p-6 mb-6">
          <h2 style={{ fontFamily: 'Playfair Display', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '20px' }}>
            How are you feeling right now?
          </h2>
          <div className="flex justify-center gap-6 mb-6">
            {MOODS.map(m => (
              <button
                key={m.key}
                onClick={() => { setSelectedMood(m.key); setIntensity(m.score) }}
                className={`mood-btn flex flex-col items-center gap-2 ${selectedMood === m.key ? 'active' : ''}`}
              >
                <span style={{ fontSize: '36px' }}>{m.emoji}</span>
                <span style={{ fontSize: '12px', color: selectedMood === m.key ? 'var(--accent-purple)' : 'var(--text-muted)', fontFamily: 'DM Sans' }}>
                  {m.label}
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence>
            {selectedMood && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div className="mb-4">
                  <label style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                    Intensity: {intensity}/10
                  </label>
                  <input
                    type="range" min={1} max={10} value={intensity}
                    onChange={e => setIntensity(Number(e.target.value))}
                    className="w-full accent-purple-500"
                    style={{ accentColor: 'var(--accent-purple)' }}
                  />
                </div>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="What's influencing your mood? (optional)"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'DM Sans', resize: 'none' }}
                />
                <button
                  onClick={handleLog}
                  className="w-full py-3 rounded-xl font-medium transition-all hover:opacity-90"
                  style={{ background: 'var(--accent-purple)', color: '#1a1d2e', fontFamily: 'DM Sans' }}
                >
                  Log my mood ✓
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {logged && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="text-center py-3 mt-3 rounded-xl"
                style={{ background: 'rgba(110,231,183,0.15)', color: 'var(--accent-green)' }}
              >
                ✨ Mood logged! Keep it up.
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Calendar heatmap */}
        <div className="glass-card-solid p-6 mb-6">
          <h2 style={{ fontFamily: 'Playfair Display', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>
            {format(today, 'MMMM yyyy')}
          </h2>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {['M','T','W','T','F','S','S'].map((d,i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
            ))}
            {/* Offset for first day of month */}
            {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map(day => {
              const key = format(day, 'yyyy-MM-dd')
              const log = logsByDate[key]
              return (
                <div
                  key={key}
                  title={log ? `${log.mood} (${log.score}/10)` : format(day, 'MMM d')}
                  className="rounded-md aspect-square flex items-center justify-center text-xs"
                  style={{
                    background: log ? MOOD_COLORS[log.mood] + '50' : 'rgba(255,255,255,0.03)',
                    border: log ? `1px solid ${MOOD_COLORS[log.mood]}60` : '1px solid transparent',
                    color: log ? MOOD_COLORS[log.mood] : 'var(--text-muted)',
                    fontSize: '11px',
                  }}
                >
                  {format(day, 'd')}
                </div>
              )
            })}
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Line chart */}
          <div className="glass-card-solid p-5 md:col-span-2">
            <h3 style={{ fontFamily: 'Playfair Display', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              7-day mood trend
            </h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData.slice(-7)}>
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)' }}
                    labelStyle={{ color: 'var(--text-muted)' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="var(--accent-purple)" strokeWidth={2.5} dot={{ fill: 'var(--accent-purple)', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No data yet — start logging!</p>
            )}
          </div>

          {/* Pie chart */}
          <div className="glass-card-solid p-5">
            <h3 style={{ fontFamily: 'Playfair Display', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Mood breakdown
            </h3>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={50} innerRadius={30}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3">
                  {pieData.map(p => (
                    <div key={p.name} className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{p.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-primary)', marginLeft: 'auto' }}>{p.value}d</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No data yet</p>
            )}
          </div>
        </div>

        {/* AI Insight */}
        {insight && (
          <div className="glass-card-solid p-5" style={{ borderLeft: '3px solid var(--accent-green)' }}>
            <h3 style={{ fontFamily: 'Playfair Display', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px' }}>
              📊 MindMate's insight
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.7' }}>{insight}</p>
          </div>
        )}
      </main>
    </div>
  )
}