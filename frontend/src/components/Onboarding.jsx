import { useState } from 'react'
import './Onboarding.css'

const STEPS = ['income', 'age', 'goals', 'risk']

const AGE_RANGES = ['18-25', '26-35', '36-45', '46-55', '55+']

const GOALS = [
  { key: 'retirement',      label: 'Retirement' },
  { key: 'home',            label: 'Buy a Home' },
  { key: 'emergency_fund',  label: 'Emergency Fund' },
  { key: 'debt_free',       label: 'Pay Off Debt' },
  { key: 'travel',          label: 'Travel' },
  { key: 'education',       label: 'Education' },
  { key: 'independence',    label: 'Financial Independence' },
]

const RISK_OPTIONS = [
  {
    key: 'conservative',
    label: 'Conservative',
    desc: 'Preserve capital. Minimal risk, slower growth.',
  },
  {
    key: 'moderate',
    label: 'Moderate',
    desc: 'Balanced growth with manageable risk.',
  },
  {
    key: 'aggressive',
    label: 'Aggressive',
    desc: 'Maximize long-term growth. Accept higher volatility.',
  },
]

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [income, setIncome] = useState('')
  const [period, setPeriod] = useState('monthly')
  const [ageRange, setAgeRange] = useState('')
  const [goalsFocus, setGoalsFocus] = useState([])
  const [risk, setRisk] = useState('')

  function toggleGoal(key) {
    setGoalsFocus(prev =>
      prev.includes(key) ? prev.filter(g => g !== key) : [...prev, key]
    )
  }

  function canAdvance() {
    if (STEPS[step] === 'income') return true // income is optional
    if (STEPS[step] === 'age')    return ageRange !== ''
    if (STEPS[step] === 'goals')  return true // optional
    if (STEPS[step] === 'risk')   return risk !== ''
    return false
  }

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      onComplete({
        income:  income ? { amount: income, period } : null,
        profile: ageRange ? { age_range: ageRange, goals_focus: goalsFocus, risk_tolerance: risk || 'moderate' } : null,
      })
    }
  }

  const isLast = step === STEPS.length - 1

  return (
    <div className="ob-overlay">
      <div className="ob-modal">
        <div className="ob-progress">
          {STEPS.map((_, i) => (
            <div key={i} className={`ob-dot${i <= step ? ' ob-dot--active' : ''}`} />
          ))}
        </div>

        {STEPS[step] === 'income' && (
          <StepIncome income={income} setIncome={setIncome} period={period} setPeriod={setPeriod} />
        )}
        {STEPS[step] === 'age' && (
          <StepAge ageRange={ageRange} setAgeRange={setAgeRange} />
        )}
        {STEPS[step] === 'goals' && (
          <StepGoals goalsFocus={goalsFocus} toggleGoal={toggleGoal} />
        )}
        {STEPS[step] === 'risk' && (
          <StepRisk risk={risk} setRisk={setRisk} />
        )}

        <div className="ob-actions">
          {step > 0 && (
            <button className="ob-btn ob-btn--back" onClick={() => setStep(s => s - 1)}>
              Back
            </button>
          )}
          <button
            className="ob-btn ob-btn--next"
            onClick={handleNext}
            disabled={!canAdvance()}
          >
            {isLast ? 'Get Started' : 'Continue'}
          </button>
        </div>

        {step === 0 && (
          <button className="ob-skip" onClick={() => onComplete({ income: null, profile: null })}>
            Skip setup
          </button>
        )}
      </div>
    </div>
  )
}

function StepIncome({ income, setIncome, period, setPeriod }) {
  return (
    <div className="ob-step">
      <h2 className="ob-title">Welcome to Tracker</h2>
      <p className="ob-sub">Let's set up your profile so we can give you personalized suggestions.</p>
      <label className="ob-label">What's your income? <span className="ob-optional">(optional)</span></label>
      <div className="ob-income-row">
        <div className="ob-input-wrap">
          <span className="ob-prefix">$</span>
          <input
            className="ob-input"
            type="number"
            min="0"
            step="100"
            placeholder="0"
            value={income}
            onChange={e => setIncome(e.target.value)}
            autoFocus
          />
        </div>
        <div className="ob-period-toggle">
          {['monthly', 'annual'].map(p => (
            <button
              key={p}
              className={`ob-period-btn${period === p ? ' ob-period-btn--active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function StepAge({ ageRange, setAgeRange }) {
  return (
    <div className="ob-step">
      <h2 className="ob-title">How old are you?</h2>
      <p className="ob-sub">We'll tailor investment suggestions to your stage of life.</p>
      <div className="ob-age-grid">
        {AGE_RANGES.map(age => (
          <button
            key={age}
            className={`ob-chip${ageRange === age ? ' ob-chip--active' : ''}`}
            onClick={() => setAgeRange(age)}
          >
            {age}
          </button>
        ))}
      </div>
    </div>
  )
}

function StepGoals({ goalsFocus, toggleGoal }) {
  return (
    <div className="ob-step">
      <h2 className="ob-title">What are your financial goals?</h2>
      <p className="ob-sub">Select all that apply. We'll focus suggestions around these.</p>
      <div className="ob-goals-grid">
        {GOALS.map(g => (
          <button
            key={g.key}
            className={`ob-chip${goalsFocus.includes(g.key) ? ' ob-chip--active' : ''}`}
            onClick={() => toggleGoal(g.key)}
          >
            {g.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function StepRisk({ risk, setRisk }) {
  return (
    <div className="ob-step">
      <h2 className="ob-title">What's your investment style?</h2>
      <p className="ob-sub">This shapes how we suggest splitting your income.</p>
      <div className="ob-risk-list">
        {RISK_OPTIONS.map(opt => (
          <button
            key={opt.key}
            className={`ob-risk-card${risk === opt.key ? ' ob-risk-card--active' : ''}`}
            onClick={() => setRisk(opt.key)}
          >
            <span className="ob-risk-label">{opt.label}</span>
            <span className="ob-risk-desc">{opt.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
