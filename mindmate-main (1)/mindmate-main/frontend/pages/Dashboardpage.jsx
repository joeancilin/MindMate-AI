import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts'
import { Flame, MessageCircle, PenLine, TrendingUp } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import api from '../api/client'

function StatCard({ icon: Icon, label, value, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card-solid p-5 flex items-center gap-4"
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p style={{ fontSize: '28px', fontFamily: 'Playfair Display', color: 'var(--text-primary)' }}>{value}</p>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>{label}</p>
      </div>
    </motion.div>
  )
}

const WEEKDAY_COLORS = {
  Monday: '#fca5a5', Tuesday: '#fbbf24', Wednesday: '#6ee7b7',
  Thursday: '#a78bfa', Friday: '#6ee7b7', Saturday: '#6ee7b7', Sunday: '#6ee7b7',
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/dashboard/stats').then(r => setStats(r.data.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen" style={{ background: 'var(--bg-primary)' }}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-accent-purple border-t-transparent animate-spin" style={{ borderColor: 'var(--accent-purple) transparent transparent transparent' }} />
        </div>
      </div>
    )
  }

  if (!stats) return null

  const bestDayData = Object.entries(stats.best_day_of_week).map(([day, avg]) => ({
    day: day.slice(0, 3), avg, color: WEEKDAY_COLORS[day]
  }))

  const emotionData = Object.entries(stats.emotion_distribution).map(([name, pct]) => ({
    name, pct
  }))

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="mesh-bg" /><div className="noise" />
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'Playfair Display', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Your wellness journey 🌱
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Last 30 days</p>

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Flame}         label="Day streak"       value={stats.mood_streak}           color="var(--accent-coral)"  delay={0} />
            <StatCard icon={MessageCircle} label="Total chats"       value={stats.total_chats}           color="var(--accent-purple)" delay={0.1} />
            <StatCard icon={PenLine}       label="Journal entries"   value={stats.journal_entries_month} color="var(--accent-green)"  delay={0.2} />
            <StatCard icon={TrendingUp}    label="Avg mood score"    value={`${stats.avg_mood_score}/10`} color="var(--accent-purple)" delay={0.3} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* 30-day trend */}
            <div className="glass-card-solid p-5 lg:col-span-2">
              <h2 style={{ fontFamily: 'Playfair Display', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>
                30-day mood trend
              </h2>
              {stats.mood_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={stats.mood_trend}>
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                    <YAxis domain={[0, 10]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)' }} />
                    <Line type="monotone" dataKey="score" stroke="var(--accent-purple)" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '60px 0', fontSize: '14px' }}>
                  Start logging your mood to see trends here!
                </p>
              )}
            </div>

            {/* Best day */}
            <div className="glass-card-solid p-5">
              <h2 style={{ fontFamily: 'Playfair Display', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>
                Best day of week
              </h2>
              {bestDayData.some(d => d.avg > 0) ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={bestDayData} barSize={20}>
                    <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} hide />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }} />
                    <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                      {bestDayData.map((d, i) => <Cell key={i} fill="var(--accent-purple)" opacity={0.7} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '60px 0', fontSize: '14px' }}>No data yet</p>
              )}
            </div>
          </div>

          {/* Emotion distribution */}
          <div className="glass-card-solid p-5 mb-6">
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Emotion breakdown
            </h2>
            {emotionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={emotionData} layout="vertical" barSize={16}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11, textTransform: 'capitalize' }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }} formatter={v => `${v}%`} />
                  <Bar dataKey="pct" radius={[0, 6, 6, 0]} fill="var(--accent-purple)" opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0', fontSize: '14px' }}>No data yet</p>
            )}
          </div>

          {/* Weekly AI summary */}
          {stats.weekly_summary && (
            <div className="glass-card-solid p-5 mb-6" style={{ borderLeft: '3px solid var(--accent-green)' }}>
              <h2 style={{ fontFamily: 'Playfair Display', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '10px' }}>
                📋 Your week in review
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.8' }}>{stats.weekly_summary}</p>
            </div>
          )}

          {/* Achievements */}
          <div className="glass-card-solid p-5">
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Achievements
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {stats.achievements.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  title={a.desc}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl text-center"
                  style={{
                    background: a.unlocked ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${a.unlocked ? 'rgba(167,139,250,0.3)' : 'var(--border)'}`,
                    opacity: a.unlocked ? 1 : 0.4,
                    filter: a.unlocked ? 'none' : 'grayscale(1)',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{a.icon}</span>
                  <span style={{ fontSize: '11px', color: a.unlocked ? 'var(--accent-purple)' : 'var(--text-muted)', fontFamily: 'DM Sans', lineHeight: '1.3' }}>
                    {a.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}