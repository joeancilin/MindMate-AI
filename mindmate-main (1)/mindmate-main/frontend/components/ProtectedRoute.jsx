import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-accent-purple border-t-transparent animate-spin mx-auto mb-3" />
          <p style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return children
}
