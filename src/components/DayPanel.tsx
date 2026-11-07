import { DateTime } from 'luxon'
import type { PlanDay } from '../engine/types'
import TimelineItem from './TimelineItem'
import type { FlightLeg } from '../engine/types'
import { fmtDate, zoneAbbr } from './format'

interface Props {
  day: PlanDay
  legs: FlightLeg[]
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

function endZone(start: string, legs: FlightLeg[]): string {
  const t = DateTime.fromISO(start).toMillis()
  const leg = legs.find((l) => DateTime.fromISO(l.departLocal, { zone: l.fromZone }).toMillis() === t)
  return (leg ?? legs[legs.length - 1]).toZone
}

export default function DayPanel({ day, legs, isToday, now, done, onToggle }: Props) {
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
    <TimelineItem key={it.id} item={it} dayZone={day.zone} flightEndZone={endZone(it.start, legs)} done={!!done[it.id]} onToggle={onToggle} />
  ))
  if (nowAt >= 0) rows.splice(nowAt, 0, nowLine)

  return (
    <section className="daypanel" aria-labelledby={`day-${day.date}`}>
      <h3 id={`day-${day.date}`} className="day-title">
        {fmtDate(day.date, 'cccc, d LLLL')} <span className="day-label">{day.label}</span>
      </h3>
      {day.phase === 'travel' && (
        <p className="hint">
          Times are local to wherever you are at that moment, starting in{' '}
          {zoneAbbr(day.items[0]?.start ?? `${day.date}T12:00:00Z`, day.zone)}. The zone is marked whenever it changes.
        </p>
      )}
      <p className="sleepstrip">
        <strong>Sleep {day.targetBedtime} → {day.targetWake}</strong>
        <span> · {behind(day.remainingShiftHours)}</span>
      </p>
      <ol className="timeline">{rows}</ol>
    </section>
  )
}
