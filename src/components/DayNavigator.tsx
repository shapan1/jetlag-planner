import type { PlanDay } from '../engine/types'
import { fmtDate } from './format'

interface Props {
  days: PlanDay[]
  selected: number
  todayIndex: number
  onSelect: (i: number) => void
}

export default function DayNavigator({ days, selected, todayIndex, onSelect }: Props) {
  return (
    <nav className="daynav" aria-label="Days">
      {days.map((d, i) => (
        <button
          key={d.date}
          type="button"
          className={`chip${i === selected ? ' selected' : ''}`}
          aria-pressed={i === selected}
          onClick={() => onSelect(i)}
        >
          <span className="chip-date">{fmtDate(d.date, 'ccc d LLL')}</span>
          <span className="chip-label">{i === todayIndex ? 'Today' : d.label}</span>
        </button>
      ))}
    </nav>
  )
}
