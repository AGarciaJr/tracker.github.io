import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Suggestions.css'

const API = import.meta.env.VITE_API_URL

// Sections shown only on pro tier
const PRO_SECTIONS = [
  { key: 'action',  label: 'Recommended Actions',     accent: 'var(--accent)' },
  { key: 'insight', label: 'Insights',                accent: 'var(--saved)' },
  { key: 'income',  label: 'Income & Allocation',     accent: '#ca8a04' },
  { key: 'market',  label: 'Market Context',          accent: 'var(--invested)' },
  { key: 'profile', label: 'Profile Recommendations', accent: '#db2777' },
]

// Sections shown on free tier too
const FREE_SECTIONS = [
  { key: 'alert', label: 'Alerts', accent: 'var(--spent)' },
]

const ALL_SECTIONS = [...FREE_SECTIONS, ...PRO_SECTIONS]

function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export default function Suggestions({ data, report, onSaveReport }) {
  const { auth }  = useAuth()
  const isPro     = auth?.tier === 'pro'
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function generateReport() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/analyze`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const result = await res.json()
      onSaveReport({ ...result, generated_at: new Date().toISOString() })
    } catch (e) {
      setError(e.message.includes('fetch')
        ? 'Cannot reach backend. Run: cd backend && .venv/bin/uvicorn main:app --reload'
        : e.message
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="suggestions">
      <div className="sug-top">
        <div>
          <h2 className="sug-heading">My Reports</h2>
          <p className="sug-sub">
            {report
              ? `Last generated ${fmtDate(report.generated_at)}`
              : 'Powered by FRED, Alpha Vantage, yfinance, and your profile.'}
          </p>
        </div>
        <button className="btn-analyze" onClick={generateReport} disabled={loading}>
          {loading ? 'Generating…' : report ? 'Refresh' : 'Generate Report'}
        </button>
      </div>

      {error && <div className="sug-error">{error}</div>}

      {!report && !loading && !error && (
        <div className="sug-placeholder">
          <p>Click <strong>Generate Report</strong> to get a personalised financial analysis based on your data and live market conditions. Reports are saved and persist between sessions.</p>
        </div>
      )}

      {report && (
        <div className="report">
          <div className="report-summary">{report.summary}</div>

          {report.metrics && Object.keys(report.metrics).length > 0 && (
            <div className="report-metrics">
              <MetricPill label="Savings rate"    value={`${report.metrics.savings_rate}%`}   color="saved" />
              <MetricPill label="Investment rate" value={`${report.metrics.investment_rate}%`} color="invested" />
              <MetricPill label="Spending rate"   value={`${report.metrics.spending_rate}%`}  color="spent" />
              <MetricPill
                label="Net"
                value={`${report.metrics.net >= 0 ? '+' : ''}$${Math.abs(report.metrics.net).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                color={report.metrics.net >= 0 ? 'saved' : 'spent'}
              />
            </div>
          )}

          {/* Free + Pro sections */}
          {(isPro ? ALL_SECTIONS : FREE_SECTIONS).map(section => {
            const items = (report.suggestions || []).filter(s => s.type === section.key)
            if (items.length === 0) return null
            const ordered = [
              ...items.filter(s => s.priority === 'high'),
              ...items.filter(s => s.priority !== 'high'),
            ]
            return (
              <ReportSection key={section.key} section={section} items={ordered} />
            )
          })}

          {/* Pro upgrade gate */}
          {!isPro && (
            <div className="report-upgrade">
              <div className="report-upgrade-preview">
                {PRO_SECTIONS.map(s => (
                  <span key={s.key} className="report-upgrade-tag">{s.label}</span>
                ))}
              </div>
              <p className="report-upgrade-title">More in Tracker Pro</p>
              <p className="report-upgrade-sub">
                Unlock the full report — Recommended Actions, Insights, Income & Allocation, Market Context, and Profile Recommendations. Plus daily email reports sent at the right time.
              </p>
              <span className="report-upgrade-badge">Pro</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ReportSection({ section, items }) {
  return (
    <div className="report-section">
      <div className="report-section-header" style={{ borderLeftColor: section.accent }}>
        <span className="report-section-title">{section.label}</span>
        <span className="report-section-count">{items.length}</span>
      </div>
      <div className="report-section-items">
        {items.map((item, i) => <ReportItem key={i} item={item} />)}
      </div>
    </div>
  )
}

function ReportItem({ item }) {
  return (
    <div className={`report-item${item.priority === 'high' ? ' report-item--high' : ''}`}>
      <div className="report-item-header">
        <span className="report-item-title">{item.title}</span>
        {item.priority === 'high' && <span className="report-item-urgent">Urgent</span>}
      </div>
      <p className="report-item-text">{item.text}</p>
      {item.sources && item.sources.length > 0 && (
        <div className="sug-sources">
          {item.sources.map(src => <span key={src} className="sug-source">{src}</span>)}
        </div>
      )}
    </div>
  )
}

function MetricPill({ label, value, color }) {
  return (
    <div className="metric-pill">
      <span className="metric-label">{label}</span>
      <span className={`metric-value metric-value--${color}`}>{value}</span>
    </div>
  )
}
