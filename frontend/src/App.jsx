import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Summary from './components/Summary'
import Board from './components/Board'
import Goals from './components/Goals'
import Suggestions from './components/Suggestions'
import Profile from './components/Profile'
import Onboarding from './components/Onboarding'
import './App.css'

const API = import.meta.env.VITE_API_URL

const DEFAULT = {
  saved: [], invested: [], spent: [], goals: [],
  income: null,
  profile: null,
  report: null,
}

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'goals',     label: 'Goals' },
  { key: 'reports',   label: 'My Reports' },
  { key: 'profile',   label: 'Profile' },
]

function parse(val) {
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

export default function App() {
  const { auth, logout } = useAuth()
  const navigate = useNavigate()

  const [data, setData]     = useState(DEFAULT)
  const [tab, setTab]       = useState('dashboard')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const saveTimerRef = useRef(null)

  // ── Load user data from backend on mount ───────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${API}/user/data`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        })
        if (!res.ok) throw new Error('fetch failed')
        const remote = await res.json()
        const merged = { ...DEFAULT, ...remote }
        setData(merged)
        // Only show onboarding for brand-new users who have never set a profile
        if (!merged.profile) setShowOnboarding(true)
      } catch {
        setData(DEFAULT)
        // Don't force onboarding on a network error
      } finally {
        setLoaded(true)
      }
    }
    fetchData()
  }, [auth.token])

  // ── Debounced save to backend whenever data changes ────────────────────────
  const saveToBackend = useCallback((newData) => {
    if (!loaded) return
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`${API}/user/data`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify(newData),
        })
      } catch { /* silent — data is still in state */ }
    }, 800)
  }, [auth.token, loaded])

  useEffect(() => {
    if (loaded) saveToBackend(data)
  }, [data, loaded, saveToBackend])

  // ── Data mutations ─────────────────────────────────────────────────────────
  function setDataAndSave(updater) {
    setData(prev => typeof updater === 'function' ? updater(prev) : updater)
  }

  function completeOnboarding({ income, profile }) {
    setDataAndSave(d => ({ ...d, income, profile }))
    setShowOnboarding(false)
  }

  function saveProfile({ income, profile }) {
    setDataAndSave(d => ({ ...d, income, profile }))
  }

  function saveReport(report) {
    setDataAndSave(d => ({ ...d, report }))
  }

  function addEntry(category, label, amount, allocations = []) {
    setDataAndSave(d => {
      const newEntry = { id: Date.now(), label, amount }
      let updatedGoals = d.goals
      if (allocations.length > 0) {
        updatedGoals = d.goals.map(g => {
          const alloc = allocations.find(a => a.goalId === g.id)
          if (!alloc) return g
          return { ...g, current: String((parse(g.current) + parse(alloc.amount)).toFixed(2)) }
        })
      }
      return { ...d, [category]: [...d[category], newEntry], goals: updatedGoals }
    })
  }

  function removeEntry(category, id) {
    setDataAndSave(d => ({ ...d, [category]: d[category].filter(e => e.id !== id) }))
  }

  function addGoal(title, target, extra = {}) {
    setDataAndSave(d => ({
      ...d,
      goals: [...d.goals, { id: Date.now(), title, target, current: '', ...extra }],
    }))
  }

  function updateGoal(id, field, value) {
    setDataAndSave(d => ({
      ...d,
      goals: d.goals.map(g => g.id === id ? { ...g, [field]: value } : g),
    }))
  }

  function removeGoal(id) {
    setDataAndSave(d => ({ ...d, goals: d.goals.filter(g => g.id !== id) }))
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  if (!loaded) {
    return <div className="app-loading"><span>Loading…</span></div>
  }

  return (
    <div className="app">
      {showOnboarding && <Onboarding onComplete={completeOnboarding} />}

      <header className="app-header">
        <h1>Tracker</h1>
        <nav className="app-nav">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`nav-btn${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        {auth?.isAdmin && (
          <button className="nav-btn nav-btn--admin" onClick={() => navigate('/admin')}>
            Admin
          </button>
        )}
        <button className="btn-logout" onClick={handleLogout} title="Log out">
          Log out
        </button>
      </header>

      {tab === 'dashboard' && (
        <>
          <Summary data={data} />
          <Board data={data} onAdd={addEntry} onRemove={removeEntry} />
        </>
      )}

      {tab === 'goals' && (
        <Goals
          goals={data.goals}
          onAdd={addGoal}
          onUpdate={updateGoal}
          onRemove={removeGoal}
          token={auth.token}
        />
      )}

      {tab === 'reports' && (
        <Suggestions data={data} report={data.report} onSaveReport={saveReport} />
      )}

      {tab === 'profile' && (
        <Profile data={data} onSave={saveProfile} />
      )}
    </div>
  )
}
