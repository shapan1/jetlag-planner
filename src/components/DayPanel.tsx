import { DateTime } from 'luxon'
import type { PlanDay } from '../engine/types'
import TimelineItem from './TimelineItem'
import { fmtDate } from './format'

interface Props {
  day: PlanDay
  isToday: boolean
  now: number
  done: Record<string, true>
  onToggle: (id: string) => void
}

function behind(h: number): string {
  const a = Math.round(Math.abs(h) * 2) / 2
  if (a === 0) return 'body clock in sync'
  return `body clock still ${a} h ${h > 0 ? 'behind' : 'ahead'}`
}

export default function DayPanel({ day, isToday, now, done, onToggle }: Props) {
  const items = [...day.items].sort(
    (a, b) => DateTime.fromISO(a.start).toMillis() - DateTime.fromISO(b.start).toMillis(),
  )
  const nowIdx = isToday ? items.findIndex((it) => DateTime.fromISO(it.start).toMillis() > now) : -1
  const nowAt = isToday ? (nowIdx === -1 ? items.length : nowIdx) : -1
  const nowLine = (
    <li className="now-line" aria-label="Current time" key="now">
      <span>Now · {DateTime.fromMillis(now).setZone(day.zone).toFormat('HH:mm')}</span>
    </li>
  )

  const rows = items.map((it) => (
    <TimelineItem key={it.id} item={it} dayZone={day.zone} done={!!done[it.id]} onToggle={onToggle} />
  ))
  if (nowAt >= 0) rows.splice(nowAt, 0, nowLine)

  return (
    <section className="daypanel" aria-labelledby={`day-${day.date}`}>
      <h3 id={`day-${day.date}`} className="day-title">
        {fmtDate(day.date, 'cccc, d LLLL')} <span className="day-label">{day.label}</span>
      </h3>
      <p className="sleepstrip">
        <strong>Sleep {day.targetBedtime} → {day.targetWake}</strong>
        <span> · {behind(day.remainingShiftHours)}</span>
      </p>
      <ol className="timeline">{rows}</ol>
    </section>
  )
}
