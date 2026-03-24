import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Auth.css'

const API = import.meta.env.VITE_API_URL

export default function ForgotPassword() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch(`${API}/auth/forgot-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Something went wrong')
      setSent(true)
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
        {sent ? (
          <>
            <h1 className="auth-title">Check your email</h1>
            <p className="auth-sub">
              If <strong>{email}</strong> is registered, you'll receive a reset
              link within a few minutes. Check your spam folder if it doesn't arrive.
            </p>
            <p className="auth-switch">
              <Link to="/login">← Back to log in</Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="auth-title">Forgot your password?</h1>
            <p className="auth-sub">
              Enter your email and we'll send you a link to reset your password.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-label">
                Email
                <input
                  className="auth-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </label>

              {error && <p className="auth-error">{error}</p>}

              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
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
