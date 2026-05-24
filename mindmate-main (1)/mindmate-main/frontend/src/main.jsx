import React from 'react'
import ReactDOM from 'react-dom/client'
import { Navigate, Route, BrowserRouter as Router, Routes, useNavigate } from 'react-router-dom'
import '../index.css'
import { AuthProvider, useAuth } from '../context/AuthContext'
import ProtectedRoute from '../components/ProtectedRoute'
import ChatPage from '../pages/chatpage'
import DashboardPage from '../pages/Dashboardpage'
import JournalPage from '../pages/journalpage'
import MoodPage from '../pages/moodpage'
import ProfilePage from '../pages/Profilepage'

window.addEventListener('error', (event) => {
  const root = document.getElementById('root')
  if (!root) return
  root.innerHTML = `
    <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f1117;color:#f1f5f9;font-family:Arial,sans-serif;padding:24px">
      <section style="max-width:680px;background:#1a1d2e;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:24px">
        <h1 style="margin:0 0 10px;font-size:24px">MindMate could not start</h1>
        <p style="margin:0 0 16px;color:#94a3b8">Open this app through the Vite dev server, not by opening index.html directly.</p>
        <pre style="white-space:pre-wrap;color:#fca5a5;background:rgba(255,255,255,.04);padding:12px;border-radius:8px">${event.message}</pre>
      </section>
    </main>
  `
})

function LoginPage() {
  const navigate = useNavigate()
  const { login, signup } = useAuth()
  const [isSignup, setIsSignup] = React.useState(false)
  const [form, setForm] = React.useState({ name: '', email: '', password: '', age: '' })
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isSignup) {
        await signup({ ...form, age: form.age ? Number(form.age) : undefined })
      } else {
        await login(form.email, form.password)
      }
      navigate('/chat')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not sign in. Check the backend and your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="mesh-bg" />
      <form onSubmit={submit} className="glass-card-solid p-6 w-full" style={{ maxWidth: 420 }}>
        <h1 style={{ fontFamily: 'Playfair Display', fontSize: 30, color: 'var(--text-primary)', marginBottom: 6 }}>
          MindMate
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
          {isSignup ? 'Create your wellness space.' : 'Welcome back.'}
        </p>
        {isSignup && (
          <input className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-3" style={inputStyle} placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        )}
        <input className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-3" style={inputStyle} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        <input className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-3" style={inputStyle} type="password" placeholder="Password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
        {isSignup && (
          <input className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-3" style={inputStyle} type="number" min="13" max="100" placeholder="Age" value={form.age} onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))} />
        )}
        {error && <p style={{ color: 'var(--accent-coral)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button disabled={loading} className="w-full py-3 rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-50" style={{ background: 'var(--accent-purple)', color: '#1a1d2e', fontFamily: 'DM Sans' }}>
          {loading ? 'Please wait...' : isSignup ? 'Create account' : 'Sign in'}
        </button>
        <button type="button" onClick={() => setIsSignup((v) => !v)} className="w-full mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          {isSignup ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>
      </form>
    </main>
  )
}

const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  fontFamily: 'DM Sans',
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/mood" element={<ProtectedRoute><MoodPage /></ProtectedRoute>} />
          <Route path="/journal" element={<ProtectedRoute><JournalPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

document.getElementById('root')?.setAttribute('data-react-ready', 'true')
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
