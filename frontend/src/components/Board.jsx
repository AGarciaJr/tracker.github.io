import TrackerCard from './TrackerCard'
import './Board.css'

const CATEGORIES = [
  { key: 'saved',    label: 'Saved' },
  { key: 'invested', label: 'Invested' },
  { key: 'spent',    label: 'Spent' },
]

export default function Board({ data, onAdd, onRemove }) {
  return (
    <div className="board">
      {CATEGORIES.map(cat => (
        <TrackerCard
          key={cat.key}
          category={cat.key}
          label={cat.label}
          entries={data[cat.key]}
          goals={cat.key === 'saved' ? data.goals : []}
          onAdd={(label, amount, allocations) => onAdd(cat.key, label, amount, allocations)}
          onRemove={(id) => onRemove(cat.key, id)}
        />
      ))}
    </div>
  )
}
