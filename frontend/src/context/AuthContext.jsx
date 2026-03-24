import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const token    = localStorage.getItem('tracker_token')
    const email    = localStorage.getItem('tracker_email')
    const tier     = localStorage.getItem('tracker_tier')    || 'free'
    const isAdmin  = localStorage.getItem('tracker_is_admin') === 'true'
    return token ? { token, email, tier, isAdmin } : null
  })

  const login = useCallback((token, email, tier = 'free', isAdmin = false) => {
    localStorage.setItem('tracker_token',    token)
    localStorage.setItem('tracker_email',    email)
    localStorage.setItem('tracker_tier',     tier)
    localStorage.setItem('tracker_is_admin', String(isAdmin))
    setAuth({ token, email, tier, isAdmin })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('tracker_token')
    localStorage.removeItem('tracker_email')
    localStorage.removeItem('tracker_tier')
    localStorage.removeItem('tracker_is_admin')
    setAuth(null)
  }, [])

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
