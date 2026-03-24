import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import './Auth.css'

const API = import.meta.env.VITE_API_URL

export default function ResetPassword() {
  const [searchParams]          = useSearchParams()
  const token                   = searchParams.get('token') || ''
  const navigate                = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)

  useEffect(() => {
    if (!token) setError('Missing or invalid reset link.')
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const res  = await fetch(`${API}/auth/reset-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Reset failed')
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <Link to="/" className="auth-logo">Tracker</Link>

      <div className="auth-card">
        {done ? (
          <>
            <h1 className="auth-title">Password updated</h1>
            <p className="auth-sub">Your password has been reset. Redirecting you to log in…</p>
          </>
        ) : (
          <>
            <h1 className="auth-title">Set a new password</h1>
            <p className="auth-sub">Choose a strong password for your account.</p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-label">
                New password
                <input
                  className="auth-input"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus
                  disabled={!token}
                />
              </label>

              <label className="auth-label">
                Confirm password
                <input
                  className="auth-input"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  disabled={!token}
                />
              </label>

              {error && <p className="auth-error">{error}</p>}

              <button className="auth-btn" type="submit" disabled={loading || !token}>
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>

            <p className="auth-switch">
              <Link to="/login">← Back to log in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
