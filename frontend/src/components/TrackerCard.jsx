import { useState } from 'react'
import './TrackerCard.css'

function parse(val) {
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

function fmt(n) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Distribute `total` evenly across `count` buckets, rounding to cents
function evenSplit(total, count) {
  if (count === 0) return []
  const base = Math.floor((total * 100) / count) / 100
  const remainder = Math.round((total - base * count) * 100) / 100
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? String((base + remainder).toFixed(2)) : String(base.toFixed(2))
  )
}

export default function TrackerCard({ category, label, entries, goals = [], onAdd, onRemove }) {
  const [adding, setAdding]     = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newAmount, setNewAmount] = useState('')
  // step: 'form' | 'allocate'
  const [step, setStep]             = useState('form')
  const [selected, setSelected]     = useState([])   // goal ids checked
  const [splits, setSplits]         = useState({})   // goalId -> string amount

  const total = entries.reduce((sum, e) => sum + parse(e.amount), 0)
  const showGoalStep = category === 'saved' && goals.length > 0

  function resetForm() {
    setAdding(false)
    setStep('form')
    setNewLabel('')
    setNewAmount('')
    setSelected([])
    setSplits({})
  }

  function handleFormAdd(e) {
    e.preventDefault()
    if (!newAmount) return
    onAdd(newLabel.trim() || 'Entry', newAmount, [])
    resetForm()
  }

  function handleFormAllocate(e) {
    e.preventDefault()
    if (!newAmount) return
    // Pre-populate equal splits for all goals
    const amounts = evenSplit(parse(newAmount), goals.length)
    const initial = {}
    goals.forEach((g, i) => { initial[g.id] = amounts[i] })
    setSplits(initial)
    setSelected([])
    setStep('allocate')
  }

  function handleAllocate(e) {
    e.preventDefault()
    const allocations = selected.map(id => ({ goalId: id, amount: splits[id] || '0' }))
    onAdd(newLabel.trim() || 'Entry', newAmount, allocations)
    resetForm()
  }

  function toggleGoal(id) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const allocatedTotal = selected.reduce((s, id) => s + parse(splits[id] || '0'), 0)
  const entryAmount    = parse(newAmount)
  const allocDiff      = Math.abs(allocatedTotal - entryAmount)
  const allocValid     = selected.length === 0 || allocDiff < 0.01

  return (
    <div className={`tcard tcard--${category}`}>
      <div className="tcard-header">
        <h2 className="tcard-title">{label}</h2>
        <span className={`tcard-total tcard-total--${category}`}>{fmt(total)}</span>
      </div>

      <div className="tcard-entries">
        {entries.length === 0 && !adding && (
          <p className="entries-empty">No entries yet.</p>
        )}
        {entries.map(entry => (
          <div className="entry" key={entry.id}>
            <span className="entry-label">{entry.label}</span>
            <span className="entry-amount">{fmt(parse(entry.amount))}</span>
            <button className="btn-remove" onClick={() => onRemove(entry.id)} title="Remove">×</button>
          </div>
        ))}

        {adding && step === 'form' && (
          <form className="entry-form" onSubmit={handleFormAdd}>
            <input
              className="ef-input"
              placeholder="Description"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              autoFocus
            />
            <div className="ef-amount-wrap">
              <span className="ef-prefix">$</span>
              <input
                className="ef-input ef-input--amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
              />
            </div>
            <div className="ef-actions">
              <button type="submit" className="btn-confirm">Add</button>
              {showGoalStep && (
                <button type="button" className="btn-confirm btn-confirm--secondary" onClick={handleFormAllocate} disabled={!newAmount}>
                  Add & allocate →
                </button>
              )}
              <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        )}

        {adding && step === 'allocate' && (
          <form className="entry-form alloc-form" onSubmit={handleAllocate}>
            <div className="alloc-header">
              <span className="alloc-title">Allocate {fmt(entryAmount)} to goals</span>
              <span className="alloc-sub">Select which goals this contributes to</span>
            </div>

            <div className="alloc-goals">
              {goals.map(g => {
                const isChecked = selected.includes(g.id)
                const target    = parse(g.target)
                const current   = parse(g.current)
                const pct       = target > 0 ? Math.min((current / target) * 100, 100) : 0
                return (
                  <div key={g.id} className={`alloc-goal${isChecked ? ' alloc-goal--checked' : ''}`}>
                    <label className="alloc-goal-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleGoal(g.id)}
                      />
                      <div className="alloc-goal-info">
                        <span className="alloc-goal-name">{g.title}</span>
                        <span className="alloc-goal-progress">{Math.round(pct)}% funded</span>
                      </div>
                    </label>
                    {isChecked && (
                      <div className="alloc-split-wrap">
                        <span className="ef-prefix">$</span>
                        <input
                          className="ef-input ef-input--amount alloc-split-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={splits[g.id] || ''}
                          onChange={e => setSplits(prev => ({ ...prev, [g.id]: e.target.value }))}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {selected.length > 0 && !allocValid && (
              <p className="alloc-warning">
                Allocated {fmt(allocatedTotal)} — must equal {fmt(entryAmount)}
              </p>
            )}

            <div className="ef-actions">
              <button type="submit" className="btn-confirm" disabled={!allocValid}>Add</button>
              <button type="button" className="btn-cancel" onClick={() => setStep('form')}>Back</button>
            </div>
          </form>
        )}
      </div>

      {!adding && (
        <button className={`btn-add-entry btn-add-entry--${category}`} onClick={() => setAdding(true)}>
          + Add entry
        </button>
      )}

    </div>
  )
}
