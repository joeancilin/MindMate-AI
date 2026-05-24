import { useState } from 'react'
import { motion } from 'framer-motion'
import { Save, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import api from '../api/client'

const TONES = [
  { value: 'supportive', label: 'Supportive & warm', desc: 'Gentle, nurturing responses' },
  { value: 'direct', label: 'Direct & practical', desc: 'Straightforward guidance' },
  { value: 'reflective', label: 'Reflective & deep', desc: 'Thoughtful, introspective' },
]

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth()
  const [form, setForm] = useState({
    name: user?.name || '',
    age: user?.age || '',
    bio: user?.bio || '',
    language: user?.language || 'en',
    tone_preference: user?.tone_preference || 'supportive',
    mood_reminders: user?.mood_reminders ?? true,
    weekly_summary: user?.weekly_summary ?? true,
  })
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const res = await api.put('/api/user/profile', form)
      updateUser(res.data.data)
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    try {
      await api.post('/api/user/change-password', pwForm)
      setPwForm({ current_password: '', new_password: '' })
      alert('Password changed successfully!')
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed')
    }
  }

  const handleDeleteAccount = async () => {
    await api.delete('/api/user/account')
    await logout()
    window.location.href = '/'
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    fontFamily: 'DM Sans',
    fontSize: '14px',
    outline: 'none',
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="mesh-bg" /><div className="noise" />
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'Playfair Display', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Your profile
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Personalise your MindMate experience</p>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ background: 'rgba(167,139,250,0.2)', color: 'var(--accent-purple)' }}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <p style={{ fontFamily: 'Playfair Display', fontSize: '20px', color: 'var(--text-primary)' }}>{user?.name}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{user?.email}</p>
            </div>
          </div>

          {/* Basic info */}
          <div className="glass-card-solid p-6 mb-5">
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Basic info
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Name</label>
                <input style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Age</label>
                <input style={inputStyle} type="number" min={13} max={25} value={form.age} onChange={e => setForm(p => ({ ...p, age: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="mb-4">
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Bio</label>
              <textarea
                style={{ ...inputStyle, resize: 'none' }}
                rows={3}
                placeholder="What brings you to MindMate?"
                value={form.bio}
                onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Language</label>
              <select style={inputStyle} value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))}>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="ta">Tamil</option>
              </select>
            </div>
          </div>

          {/* AI tone */}
          <div className="glass-card-solid p-6 mb-5">
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              AI tone preference
            </h2>
            <div className="flex flex-col gap-3">
              {TONES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setForm(p => ({ ...p, tone_preference: t.value }))}
                  className="flex items-center justify-between p-4 rounded-xl transition-all text-left"
                  style={{
                    border: `1px solid ${form.tone_preference === t.value ? 'rgba(167,139,250,0.5)' : 'var(--border)'}`,
                    background: form.tone_preference === t.value ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div>
                    <p style={{ color: form.tone_preference === t.value ? 'var(--accent-purple)' : 'var(--text-primary)', fontSize: '14px', fontFamily: 'DM Sans' }}>{t.label}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{t.desc}</p>
                  </div>
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: form.tone_preference === t.value ? 'var(--accent-purple)' : 'var(--text-muted)' }}>
                    {form.tone_preference === t.value && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-purple)' }} />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Notification prefs */}
          <div className="glass-card-solid p-6 mb-5">
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Notifications
            </h2>
            {[
              { key: 'mood_reminders', label: 'Daily mood reminders', desc: 'Gentle reminders to log your mood' },
              { key: 'weekly_summary', label: 'Weekly email summary', desc: 'AI-generated wellness recap' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'DM Sans' }}>{item.label}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.desc}</p>
                </div>
                <button
                  onClick={() => setForm(p => ({ ...p, [item.key]: !p[item.key] }))}
                  className="relative w-10 h-6 rounded-full transition-all"
                  style={{ background: form[item.key] ? 'var(--accent-purple)' : 'rgba(255,255,255,0.1)' }}
                >
                  <div className="absolute w-4 h-4 rounded-full bg-white top-1 transition-all" style={{ left: form[item.key] ? '22px' : '4px' }} />
                </button>
              </div>
            ))}
          </div>

          {/* Save button */}
          {error && <p style={{ color: 'var(--accent-coral)', fontSize: '13px', marginBottom: '8px' }}>{error}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl font-medium mb-6 transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{ background: 'var(--accent-purple)', color: '#1a1d2e', fontFamily: 'DM Sans' }}
          >
            <Save size={16} />
            {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save changes'}
          </button>

          {/* Change password */}
          <div className="glass-card-solid p-6 mb-5">
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Change password
            </h2>
            <div className="flex flex-col gap-3">
              <input style={inputStyle} type="password" placeholder="Current password" value={pwForm.current_password} onChange={e => setPwForm(p => ({ ...p, current_password: e.target.value }))} />
              <input style={inputStyle} type="password" placeholder="New password (8+ chars)" value={pwForm.new_password} onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))} />
              <button onClick={handleChangePassword} className="py-2.5 rounded-xl text-sm font-medium hover:opacity-90" style={{ background: 'rgba(167,139,250,0.15)', color: 'var(--accent-purple)', border: '1px solid rgba(167,139,250,0.25)', fontFamily: 'DM Sans' }}>
                Update password
              </button>
            </div>
          </div>

          {/* Delete account */}
          <div className="glass-card-solid p-6 mb-10" style={{ borderColor: 'rgba(252,165,165,0.2)' }}>
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: '18px', color: 'var(--accent-coral)', marginBottom: '8px' }}>
              Delete account
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>
              This will permanently delete all your chats, mood logs, and journal entries. This cannot be undone.
            </p>
            {!deleteConfirm ? (
              <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all hover:opacity-80" style={{ background: 'rgba(252,165,165,0.1)', color: 'var(--accent-coral)', border: '1px solid rgba(252,165,165,0.2)', fontFamily: 'DM Sans' }}>
                <AlertTriangle size={14} /> Delete my account
              </button>
            ) : (
              <div className="flex gap-3">
                <button onClick={handleDeleteAccount} className="px-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--accent-coral)', color: '#1a1d2e', fontFamily: 'DM Sans' }}>
                  Yes, delete
                </button>
                <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2.5 rounded-xl text-sm" style={{ color: 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'DM Sans' }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}