import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Profile.css'

const AGE_RANGES = ['18-25', '26-35', '36-45', '46-55', '55+']

const GOALS = [
  { key: 'retirement',     label: 'Retirement' },
  { key: 'home',           label: 'Buy a Home' },
  { key: 'emergency_fund', label: 'Emergency Fund' },
  { key: 'debt_free',      label: 'Pay Off Debt' },
  { key: 'travel',         label: 'Travel' },
  { key: 'education',      label: 'Education' },
  { key: 'independence',   label: 'Financial Independence' },
]

const RISK_OPTIONS = [
  { key: 'conservative', label: 'Conservative', desc: 'Preserve capital. Minimal risk, slower growth.' },
  { key: 'moderate',     label: 'Moderate',     desc: 'Balanced growth with manageable risk.' },
  { key: 'aggressive',   label: 'Aggressive',   desc: 'Maximize long-term growth. Accept higher volatility.' },
]

export default function Profile({ data, onSave }) {
  const [income,     setIncome]     = useState(data.income?.amount       || '')
  const [period,     setPeriod]     = useState(data.income?.period       || 'monthly')
  const [ageRange,   setAgeRange]   = useState(data.profile?.age_range   || '')
  const [goalsFocus, setGoalsFocus] = useState(data.profile?.goals_focus || [])
  const [risk,          setRisk]         = useState(data.profile?.risk_tolerance || '')
  const [reportHour,    setReportHour]   = useState(data.report_settings?.hour ?? 8)
  const [reportEnabled, setReportEnabled] = useState(data.report_settings?.enabled ?? false)
  const [saved,         setSaved]        = useState(false)

  const { auth } = useAuth()
  const isPro = auth?.tier === 'pro'

  function toggleGoal(key) {
    setGoalsFocus(prev =>
      prev.includes(key) ? prev.filter(g => g !== key) : [...prev, key]
    )
    setSaved(false)
  }

  function handleChange(setter) {
    return (val) => { setter(val); setSaved(false) }
  }

  function handleSave() {
    onSave({
      income:  income ? { amount: income, period } : null,
      profile: ageRange
        ? { age_range: ageRange, goals_focus: goalsFocus, risk_tolerance: risk || 'moderate' }
        : null,
      report_settings: isPro ? { enabled: reportEnabled, hour: reportHour } : data.report_settings,
    })
    setSaved(true)
  }

  const hasChanges = (
    income        !== (data.income?.amount           || '') ||
    period        !== (data.income?.period           || 'monthly') ||
    ageRange      !== (data.profile?.age_range       || '') ||
    risk          !== (data.profile?.risk_tolerance  || '') ||
    reportEnabled !== (data.report_settings?.enabled ?? false) ||
    reportHour    !== (data.report_settings?.hour    ?? 8) ||
    JSON.stringify(goalsFocus) !== JSON.stringify(data.profile?.goals_focus || [])
  )

  return (
    <div className="profile">
      <div className="profile-header">
        <h2 className="profile-heading">Profile</h2>
        <p className="profile-sub">Your preferences are used to personalise suggestions and reports.</p>
      </div>

      <div className="profile-sections">

        {/* Income */}
        <section className="profile-section">
          <h3 className="profile-section-title">Income</h3>
          <div className="profile-income-row">
            <div className="profile-input-wrap">
              <span className="profile-prefix">$</span>
              <input
                className="profile-input"
                type="number"
                min="0"
                step="100"
                placeholder="0"
                value={income}
                onChange={e => { setIncome(e.target.value); setSaved(false) }}
              />
            </div>
            <div className="profile-period-toggle">
              {['monthly', 'annual'].map(p => (
                <button
                  key={p}
                  className={`profile-period-btn${period === p ? ' profile-period-btn--active' : ''}`}
                  onClick={() => handleChange(setPeriod)(p)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Age */}
        <section className="profile-section">
          <h3 className="profile-section-title">Age range</h3>
          <div className="profile-chips">
            {AGE_RANGES.map(age => (
              <button
                key={age}
                className={`profile-chip${ageRange === age ? ' profile-chip--active' : ''}`}
                onClick={() => handleChange(setAgeRange)(age)}
              >
                {age}
              </button>
            ))}
          </div>
        </section>

        {/* Goals */}
        <section className="profile-section">
          <h3 className="profile-section-title">Financial goals</h3>
          <p className="profile-section-sub">Select all that apply.</p>
          <div className="profile-chips">
            {GOALS.map(g => (
              <button
                key={g.key}
                className={`profile-chip${goalsFocus.includes(g.key) ? ' profile-chip--active' : ''}`}
                onClick={() => toggleGoal(g.key)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </section>

        {/* Risk */}
        <section className="profile-section">
          <h3 className="profile-section-title">Investment style</h3>
          <div className="profile-risk-list">
            {RISK_OPTIONS.map(opt => (
              <button
                key={opt.key}
                className={`profile-risk-card${risk === opt.key ? ' profile-risk-card--active' : ''}`}
                onClick={() => handleChange(setRisk)(opt.key)}
              >
                <span className="profile-risk-label">{opt.label}</span>
                <span className="profile-risk-desc">{opt.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Daily report — pro only */}
        <section className="profile-section">
          <div className="profile-section-header-row">
            <h3 className="profile-section-title">Daily report email</h3>
            {!isPro && <span className="profile-pro-badge">Pro</span>}
          </div>
          {isPro ? (
            <>
              <p className="profile-section-sub">
                Receive your full report by email every day. We send it after market close (4:30 PM ET) or at your chosen hour.
              </p>
              <div className="profile-daily-row">
                <label className="profile-toggle">
                  <input
                    type="checkbox"
                    checked={reportEnabled}
                    onChange={e => { setReportEnabled(e.target.checked); setSaved(false) }}
                  />
                  <span>Enable daily report</span>
                </label>
                {reportEnabled && (
                  <div className="profile-hour-wrap">
                    <span className="profile-section-sub">Send at</span>
                    <select
                      className="profile-hour-select"
                      value={reportHour}
                      onChange={e => { setReportHour(Number(e.target.value)); setSaved(false) }}
                    >
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>
                          {h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`}
                        </option>
                      ))}
                    </select>
                    <span className="profile-section-sub">your local time</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="profile-section-sub profile-locked">
              Upgrade to Pro to receive a full daily report by email at the time of your choice.
            </p>
          )}
        </section>

      </div>

      <div className="profile-footer">
        <button
          className="profile-save-btn"
          onClick={handleSave}
          disabled={!hasChanges && !saved}
        >
          {saved ? 'Saved!' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
