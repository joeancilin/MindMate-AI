import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/auth/me')
      .then((res) => setUser(res.data.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password })
    setUser(res.data.data)
    return res.data.data
  }

  const signup = async (data) => {
    const res = await api.post('/api/auth/signup', data)
    setUser(res.data.data)
    return res.data.data
  }

  const logout = async () => {
    await api.post('/api/auth/logout')
    setUser(null)
  }

  const updateUser = (updated) => setUser(updated)

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
