import './Summary.css'

function parse(val) {
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

function sum(entries) {
  return entries.reduce((s, e) => s + parse(e.amount), 0)
}

function fmt(n) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function Summary({ data }) {
  const saved = sum(data.saved)
  const invested = sum(data.invested)
  const spent = sum(data.spent)
  const net = saved + invested - spent
  const total = saved + invested + spent

  if (total === 0) return null

  return (
    <div className="summary">
      <div className="summary-stats">
        <Stat label="Saved" value={fmt(saved)} color="saved" />
        <Stat label="Invested" value={fmt(invested)} color="invested" />
        <Stat label="Spent" value={fmt(spent)} color="spent" />
        <Stat
          label="Net"
          value={`${net >= 0 ? '+' : ''}${fmt(Math.abs(net))}`}
          color={net >= 0 ? 'saved' : 'spent'}
          bold
        />
      </div>

      {total > 0 && (
        <div className="summary-bar-wrap">
          <div className="summary-bar">
            {saved > 0 && <div className="bar-seg bar-seg--saved" style={{ width: `${(saved / total) * 100}%` }} title={`Saved: ${fmt(saved)}`} />}
            {invested > 0 && <div className="bar-seg bar-seg--invested" style={{ width: `${(invested / total) * 100}%` }} title={`Invested: ${fmt(invested)}`} />}
            {spent > 0 && <div className="bar-seg bar-seg--spent" style={{ width: `${(spent / total) * 100}%` }} title={`Spent: ${fmt(spent)}`} />}
          </div>
          <div className="bar-legend">
            <span className="legend-dot legend-dot--saved" /> Saved
            <span className="legend-dot legend-dot--invested" /> Invested
            <span className="legend-dot legend-dot--spent" /> Spent
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color, bold }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value stat-value--${color}${bold ? ' stat-value--bold' : ''}`}>{value}</span>
    </div>
  )
}
