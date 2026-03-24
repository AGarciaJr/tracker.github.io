import { Link } from 'react-router-dom'
import './Landing.css'

const FEATURES = [
  {
    icon: '◈',
    title: 'Unified Dashboard',
    desc: 'Track everything you save, invest, and spend in one clean view. Visual breakdowns update instantly as you add entries.',
    accent: 'saved',
  },
  {
    icon: '◎',
    title: 'Goal Tracking',
    desc: 'Set savings targets for anything — emergency fund, home, travel. Allocate savings directly to goals as you add them.',
    accent: 'invested',
  },
  {
    icon: '◬',
    title: 'Smart Suggestions',
    desc: 'Personalized insights powered by live market data from FRED and Alpha Vantage. Backed by real rates, real inflation.',
    accent: 'accent',
  },
]

const DATA_SOURCES = ['FRED', 'Alpha Vantage', 'yfinance']

export default function Landing() {
  return (
    <div className="landing">
      <nav className="land-nav">
        <span className="land-logo">Tracker</span>
        <div className="land-nav-actions">
          <Link to="/login" className="land-nav-link">Log in</Link>
          <Link to="/signup" className="land-btn-nav">Sign up free</Link>
        </div>
      </nav>

      <section className="land-hero">
        <div className="land-hero-badge">Personal finance, simplified</div>
        <h1 className="land-hero-title">
          Your finances,<br />finally organized.
        </h1>
        <p className="land-hero-sub">
          Track what you save, invest, and spend. Set meaningful goals.
          Get suggestions backed by real market data and your personal profile.
        </p>
        <div className="land-hero-cta">
          <Link to="/signup" className="land-btn-primary">Get started free</Link>
          <Link to="/login" className="land-btn-ghost">Log in</Link>
        </div>

        <div className="land-preview">
          <div className="land-preview-bar">
            <div className="land-preview-seg land-preview-seg--saved"  style={{ width: '38%' }} title="Saved" />
            <div className="land-preview-seg land-preview-seg--invested" style={{ width: '28%' }} title="Invested" />
            <div className="land-preview-seg land-preview-seg--spent" style={{ width: '34%' }} title="Spent" />
          </div>
          <div className="land-preview-stats">
            <PreviewStat label="Saved"    value="$4,200" color="saved" />
            <PreviewStat label="Invested" value="$3,100" color="invested" />
            <PreviewStat label="Spent"    value="$3,800" color="spent" />
            <PreviewStat label="Net"      value="+$3,500" color="saved" bold />
          </div>
        </div>
      </section>

      <section className="land-features">
        {FEATURES.map(f => (
          <div key={f.title} className={`land-feature-card land-feature-card--${f.accent}`}>
            <span className="land-feature-icon">{f.icon}</span>
            <h3 className="land-feature-title">{f.title}</h3>
            <p className="land-feature-desc">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="land-data">
        <p className="land-data-label">Powered by real data</p>
        <div className="land-data-sources">
          {DATA_SOURCES.map(s => (
            <span key={s} className="land-data-source">{s}</span>
          ))}
        </div>
      </section>

      <footer className="land-footer">
        <span>Tracker — built to grow with you.</span>
        <div className="land-footer-links">
          <Link to="/login">Log in</Link>
          <Link to="/signup">Sign up</Link>
        </div>
      </footer>
    </div>
  )
}

function PreviewStat({ label, value, color, bold }) {
  return (
    <div className="preview-stat">
      <span className="preview-stat-label">{label}</span>
      <span className={`preview-stat-value preview-stat-value--${color}${bold ? ' preview-stat-value--bold' : ''}`}>
        {value}
      </span>
    </div>
  )
}
