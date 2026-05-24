import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart2, BookOpen, Brain, LayoutDashboard,
  LogOut, Plus, User
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

const navItems = [
  { to: '/mood', icon: BarChart2, label: 'Mood Tracker' },
  { to: '/journal', icon: BookOpen, label: 'Journal' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export default function Sidebar({ chats = [], onNewChat, onSelectChat, activeChatId }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleNewChat = async () => {
    try {
      const res = await api.post('/api/chats')
      onNewChat?.(res.data.data)
      navigate('/chat')
    } catch (e) {
      console.error(e)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const now = new Date()
  const today = chats.filter((c) => new Date(c.created_at).toDateString() === now.toDateString())
  const yesterday = chats.filter((c) => {
    const d = new Date(c.created_at)
    const y = new Date(now)
    y.setDate(y.getDate() - 1)
    return d.toDateString() === y.toDateString()
  })
  const older = chats.filter((c) => {
    const d = new Date(c.created_at)
    const y = new Date(now)
    y.setDate(y.getDate() - 1)
    return d < y && d.toDateString() !== y.toDateString()
  })

  const ChatGroup = ({ label, items }) => items.length === 0 ? null : (
    <div className="mb-2">
      <p className="px-3 py-1 text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {items.map((chat) => (
        <button
          key={chat.id}
          onClick={() => onSelectChat?.(chat)}
          className="w-full text-left px-3 py-2 rounded-xl text-sm transition-all hover:bg-white/5 truncate"
          style={{
            color: activeChatId === chat.id ? 'var(--accent-purple)' : 'var(--text-muted)',
            background: activeChatId === chat.id ? 'rgba(167,139,250,0.1)' : 'transparent',
            fontFamily: 'DM Sans',
          }}
        >
          {chat.title}
        </button>
      ))}
    </div>
  )

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      style={{
        width: '240px',
        minWidth: '240px',
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      <div className="p-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.2)' }}>
          <Brain size={16} style={{ color: 'var(--accent-purple)' }} />
        </div>
        <span style={{ fontFamily: 'Playfair Display', fontSize: '18px', color: 'var(--text-primary)' }}>MindMate</span>
      </div>

      <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0" style={{ background: 'rgba(167,139,250,0.2)', color: 'var(--accent-purple)' }}>
          {user?.name?.charAt(0)?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
        </div>
      </div>

      <div className="p-3">
        <button onClick={handleNewChat} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90" style={{ background: 'rgba(167,139,250,0.15)', color: 'var(--accent-purple)', border: '1px solid rgba(167,139,250,0.25)' }}>
          <Plus size={16} /> New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1">
        <ChatGroup label="Today" items={today} />
        <ChatGroup label="Yesterday" items={yesterday} />
        <ChatGroup label="This Week" items={older} />
      </div>

      <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mb-0.5 ${isActive ? 'bg-white/5' : 'hover:bg-white/5'}`}
            style={({ isActive }) => ({
              color: isActive ? 'var(--accent-purple)' : 'var(--text-muted)',
              fontFamily: 'DM Sans',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full transition-all hover:bg-white/5 mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    </motion.aside>
  )
}
