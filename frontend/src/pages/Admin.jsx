import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Admin.css'

const API = import.meta.env.VITE_API_URL

const TABS = [
  { key: 'overview',  label: 'Overview' },
  { key: 'roadmap',   label: 'Roadmap' },
  { key: 'users',     label: 'Users' },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

// ── Overview tab ───────────────────────────────────────────────────────────

function Overview({ token }) {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API}/admin/stats`, { headers: authHeaders(token) })
      .then(r => r.json())
      .then(setStats)
      .catch(() => setError('Failed to load stats'))
  }, [token])

  if (error) return <p className="admin-error">{error}</p>
  if (!stats) return <p className="admin-muted">Loading…</p>

  return (
    <div className="admin-overview">
      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <span className="admin-stat-value">{stats.total_users}</span>
          <span className="admin-stat-label">Total Users</span>
        </div>
        <div className="admin-stat-card admin-stat-card--pro">
          <span className="admin-stat-value">{stats.pro_users}</span>
          <span className="admin-stat-label">Pro</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-value">{stats.free_users}</span>
          <span className="admin-stat-label">Free</span>
        </div>
      </div>
    </div>
  )
}

// ── Roadmap tab ────────────────────────────────────────────────────────────

const STATUS_CYCLE = { '[ ]': '[~]', '[~]': '[x]', '[x]': '[ ]' }
const STATUS_LABEL = { '[ ]': 'Planned', '[~]': 'In Progress', '[x]': 'Done' }
const STATUS_CLASS = { '[ ]': 'status--planned', '[~]': 'status--progress', '[x]': 'status--done' }

function parseFeatures(md) {
  // Returns array of { section, rows: [{ status, feature, notes, lineIdx }] }
  const lines = md.split('\n')
  const sections = []
  let current = null

  lines.forEach((line, i) => {
    if (line.startsWith('## ')) {
      current = { section: line.slice(3).trim(), rows: [] }
      sections.push(current)
      return
    }
    const m = line.match(/^\|\s*`(\[.\])`\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|$/)
    if (m && current) {
      current.rows.push({ status: m[1], feature: m[2], notes: m[3], lineIdx: i })
    }
  })
  return { sections, lines }
}

function Roadmap({ token }) {
  const [raw, setRaw]       = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft]   = useState('')

  const load = useCallback(() => {
    fetch(`${API}/admin/features`, { headers: authHeaders(token) })
      .then(r => r.json())
      .then(d => { setRaw(d.content); setDraft(d.content) })
      .catch(() => setError('Failed to load roadmap'))
  }, [token])

  useEffect(() => { load() }, [load])

  async function save(content) {
    setSaving(true)
    setSaved(false)
    try {
      await fetch(`${API}/admin/features`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ content }),
      })
      setRaw(content)
      setDraft(content)
      setSaved(true)
      setEditMode(false)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function toggleStatus(lineIdx) {
    const lines   = raw.split('\n')
    const updated = lines[lineIdx].replace(/`(\[.\])`/, (_, s) => `\`${STATUS_CYCLE[s] ?? s}\``)
    lines[lineIdx] = updated
    save(lines.join('\n'))
  }

  if (error) return <p className="admin-error">{error}</p>
  if (!raw)  return <p className="admin-muted">Loading…</p>

  if (editMode) {
    return (
      <div className="admin-roadmap-edit">
        <textarea
          className="admin-md-editor"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          spellCheck={false}
        />
        <div className="admin-edit-actions">
          <button className="admin-btn admin-btn--primary" onClick={() => save(draft)} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="admin-btn" onClick={() => { setEditMode(false); setDraft(raw) }}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  const { sections } = parseFeatures(raw)

  return (
    <div className="admin-roadmap">
      <div className="admin-roadmap-toolbar">
        <button className="admin-btn" onClick={() => setEditMode(true)}>Edit Markdown</button>
        {saved && <span className="admin-saved-badge">Saved!</span>}
      </div>

      {sections.map(sec => (
        <div key={sec.section} className="admin-roadmap-section">
          <h3 className="admin-roadmap-section-title">{sec.section}</h3>
          {sec.rows.length === 0 ? (
            <p className="admin-muted" style={{ fontSize: 12 }}>No items</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Status</th>
                  <th>Feature</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {sec.rows.map((row, i) => (
                  <tr key={i} className={row.status === '[x]' ? 'admin-row--done' : ''}>
                    <td>
                      <button
                        className={`admin-status-btn ${STATUS_CLASS[row.status] ?? ''}`}
                        onClick={() => toggleStatus(row.lineIdx)}
                        title="Click to cycle status"
                      >
                        {STATUS_LABEL[row.status] ?? row.status}
                      </button>
                    </td>
                    <td className="admin-feature-cell">{row.feature}</td>
                    <td className="admin-notes-cell">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Users tab ──────────────────────────────────────────────────────────────

function Users({ token, currentEmail }) {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [confirm, setConfirm] = useState(null) // user id pending delete

  const loadUsers = useCallback(() => {
    setLoading(true)
    fetch(`${API}/admin/users`, { headers: authHeaders(token) })
      .then(r => r.json())
      .then(u => { setUsers(u); setLoading(false) })
      .catch(() => { setError('Failed to load users'); setLoading(false) })
  }, [token])

  useEffect(() => { loadUsers() }, [loadUsers])

  async function setTier(userId, tier) {
    await fetch(`${API}/admin/users/${userId}/tier`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ tier }),
    })
    loadUsers()
  }

  async function deleteUser(userId) {
    await fetch(`${API}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    })
    setConfirm(null)
    loadUsers()
  }

  if (loading) return <p className="admin-muted">Loading…</p>
  if (error)   return <p className="admin-error">{error}</p>

  return (
    <div className="admin-users">
      {confirm !== null && (
        <div className="admin-confirm-overlay">
          <div className="admin-confirm-box">
            <p>Delete <strong>{users.find(u => u.id === confirm)?.email}</strong>?<br/>This cannot be undone.</p>
            <div className="admin-confirm-actions">
              <button className="admin-btn admin-btn--danger" onClick={() => deleteUser(confirm)}>Delete</button>
              <button className="admin-btn" onClick={() => setConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Email</th>
            <th>Tier</th>
            <th>Joined</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => {
            const isMe = u.email === currentEmail
            return (
              <tr key={u.id}>
                <td className="admin-muted" style={{ fontSize: 12 }}>{u.id}</td>
                <td>
                  {u.email}
                  {isMe && <span className="admin-you-badge">you</span>}
                </td>
                <td>
                  {isMe ? (
                    <span className={`admin-tier-badge admin-tier-badge--${u.tier}`}>{u.tier}</span>
                  ) : (
                    <select
                      className="admin-tier-select"
                      value={u.tier}
                      onChange={e => setTier(u.id, e.target.value)}
                    >
                      <option value="free">free</option>
                      <option value="pro">pro</option>
                    </select>
                  )}
                </td>
                <td className="admin-muted" style={{ fontSize: 12 }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td>
                  {!isMe && (
                    <button
                      className="admin-delete-btn"
                      onClick={() => setConfirm(u.id)}
                      title="Delete user"
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Admin page ─────────────────────────────────────────────────────────────

export default function Admin() {
  const { auth } = useAuth()
  const navigate  = useNavigate()
  const [tab, setTab] = useState('overview')

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h2 className="admin-heading">Admin</h2>
          <p className="admin-sub">Manage users, billing, and the product roadmap.</p>
        </div>
        <button className="admin-btn" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>
      </div>

      <div className="admin-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`admin-tab${tab === t.key ? ' admin-tab--active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-body">
        {tab === 'overview' && <Overview token={auth.token} />}
        {tab === 'roadmap'  && <Roadmap  token={auth.token} />}
        {tab === 'users'    && <Users    token={auth.token} currentEmail={auth.email} />}
      </div>
    </div>
  )
}
