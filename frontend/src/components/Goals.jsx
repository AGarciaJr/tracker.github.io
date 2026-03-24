import { useState } from 'react'
import './Goals.css'

const API = import.meta.env.VITE_API_URL

function parse(val) {
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

function fmt(n) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function Goals({ goals, onAdd, onUpdate, onRemove, token }) {
  const [mode, setMode] = useState(null) // null | 'manual' | 'link'

  function close() { setMode(null) }

  return (
    <div className="goals">
      <div className="goals-header">
        <h2 className="goals-heading">Savings Goals</h2>
        {!mode && (
          <div className="goals-add-btns">
            <button className="btn-add-goal" onClick={() => setMode('manual')}>+ Add Goal</button>
            <button className="btn-add-goal btn-add-goal--link" onClick={() => setMode('link')}>
              + From Link
            </button>
          </div>
        )}
      </div>

      {mode === 'manual' && <ManualForm onAdd={onAdd} onClose={close} />}
      {mode === 'link'   && <LinkForm   onAdd={onAdd} onClose={close} token={token} />}

      {goals.length === 0 && !mode && (
        <p className="goals-empty">No goals yet — add one manually or paste an Amazon / eBay link.</p>
      )}

      <div className="goals-grid">
        {goals.map(goal => (
          <GoalCard key={goal.id} goal={goal} onUpdate={onUpdate} onRemove={onRemove} />
        ))}
      </div>
    </div>
  )
}

// ── Manual entry form ─────────────────────────────────────────────────────────

function ManualForm({ onAdd, onClose }) {
  const [title, setTitle]   = useState('')
  const [target, setTarget] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !target) return
    onAdd(title.trim(), target)
    onClose()
  }

  return (
    <form className="goal-form" onSubmit={handleSubmit}>
      <input
        className="gf-input"
        placeholder="Goal title (e.g. Emergency Fund)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        autoFocus
      />
      <div className="gf-amount-wrap">
        <span className="gf-prefix">$</span>
        <input
          className="gf-input gf-input--amount"
          type="number"
          min="0"
          step="0.01"
          placeholder="Target amount"
          value={target}
          onChange={e => setTarget(e.target.value)}
        />
      </div>
      <div className="gf-actions">
        <button type="submit" className="btn-confirm">Add Goal</button>
        <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
      </div>
    </form>
  )
}

// ── Import from link form ─────────────────────────────────────────────────────

function LinkForm({ onAdd, onClose, token }) {
  const [url, setUrl]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [preview, setPreview] = useState(null) // { title, price, image, url }
  const [title, setTitle]     = useState('')
  const [target, setTarget]   = useState('')

  async function handleFetch(e) {
    e.preventDefault()
    if (!url.trim()) return
    setError('')
    setPreview(null)
    setLoading(true)
    try {
      const res = await fetch(`${API}/wishlist/fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to fetch product')
      setPreview(data)
      setTitle(data.title || '')
      setTarget(data.price != null ? String(data.price) : '')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleConfirm(e) {
    e.preventDefault()
    if (!title.trim() || !target) return
    onAdd(title.trim(), target, { url: preview.url, image: preview.image || null })
    onClose()
  }

  return (
    <div className="goal-form">
      {!preview ? (
        <form onSubmit={handleFetch} style={{ display: 'contents' }}>
          <input
            className="gf-input"
            placeholder="Paste an Amazon or eBay product URL"
            value={url}
            onChange={e => setUrl(e.target.value)}
            autoFocus
          />
          {error && <p className="gf-error">{error}</p>}
          <div className="gf-actions">
            <button type="submit" className="btn-confirm" disabled={loading}>
              {loading ? 'Fetching…' : 'Fetch Product'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleConfirm} style={{ display: 'contents' }}>
          <div className="gf-preview">
            {preview.image && (
              <img className="gf-preview-img" src={preview.image} alt="" />
            )}
            <div className="gf-preview-body">
              <p className="gf-preview-source">
                {new URL(preview.url).hostname.replace('www.', '')}
              </p>
              <input
                className="gf-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Goal title"
              />
            </div>
          </div>
          <div className="gf-amount-wrap">
            <span className="gf-prefix">$</span>
            <input
              className="gf-input gf-input--amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="Target amount"
              value={target}
              onChange={e => setTarget(e.target.value)}
            />
          </div>
          <div className="gf-actions">
            <button type="submit" className="btn-confirm">Add Goal</button>
            <button type="button" className="btn-cancel" onClick={() => setPreview(null)}>
              ← Back
            </button>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── Goal card ─────────────────────────────────────────────────────────────────

function GoalCard({ goal, onUpdate, onRemove }) {
  const target    = parse(goal.target)
  const current   = parse(goal.current)
  const pct       = target > 0 ? Math.min((current / target) * 100, 100) : 0
  const remaining = Math.max(target - current, 0)
  const complete  = pct >= 100

  return (
    <div className={`goal-card${complete ? ' goal-card--complete' : ''}`}>
      <div className="goal-card-header">
        <h3 className="goal-card-title">{goal.title}</h3>
        <button className="btn-remove" onClick={() => onRemove(goal.id)} title="Remove">×</button>
      </div>

      {goal.image && (
        <img className="goal-card-img" src={goal.image} alt="" />
      )}

      <div className="goal-progress-wrap">
        <div className="goal-bar">
          <div className="goal-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="goal-pct">{Math.round(pct)}%</span>
      </div>

      <div className="goal-rows">
        <div className="goal-row">
          <span className="goal-row-label">Saved so far</span>
          <div className="goal-input-wrap">
            <span className="goal-input-prefix">$</span>
            <input
              className="goal-inline-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={goal.current}
              onChange={e => onUpdate(goal.id, 'current', e.target.value)}
            />
          </div>
        </div>
        <div className="goal-row">
          <span className="goal-row-label">Target</span>
          <span className="goal-row-value">{target > 0 ? fmt(target) : '—'}</span>
        </div>
        {!complete && remaining > 0 && (
          <div className="goal-row">
            <span className="goal-row-label">Remaining</span>
            <span className="goal-row-value goal-row-value--remaining">{fmt(remaining)}</span>
          </div>
        )}
        {complete && (
          <div className="goal-complete-badge">Goal reached!</div>
        )}
      </div>

      {goal.url && (
        <a
          className="goal-card-link"
          href={goal.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          View item →
        </a>
      )}
    </div>
  )
}
