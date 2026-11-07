import { DateTime } from 'luxon'
import type { ItemKind, Plan, PlanItem } from '../engine/types'

const KINDS: ItemKind[] = [
  'sleep',
  'flight',
  'melatonin',
  'reset',
  'light_seek',
  'light_avoid',
  'caffeine_stop',
]

export function icsEligible(item: PlanItem): boolean {
  return item.key === true || KINDS.includes(item.kind)
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
}

/** Fold a content line at 75 octets (UTF-8), continuation lines start with a space. */
function fold(line: string): string[] {
  const enc = new TextEncoder()
  const out: string[] = []
  let cur = ''
  let curBytes = 0
  let limit = 75
  for (const ch of line) {
    const n = enc.encode(ch).length
    if (curBytes + n > limit) {
      out.push(cur)
      cur = ' '
      curBytes = 1
      limit = 75
    }
    cur += ch
    curBytes += n
  }
  out.push(cur)
  return out
}

function utc(iso: string): string {
  return DateTime.fromISO(iso, { setZone: true }).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")
}

export function planToIcs(plan: Plan): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Jet Lag Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  const stamp = DateTime.utc().toFormat("yyyyMMdd'T'HHmmss'Z'")
  for (const day of plan.days) {
    for (const item of day.items) {
      if (!icsEligible(item)) continue
      const start = DateTime.fromISO(item.start, { setZone: true })
      if (!start.isValid) continue
      const endDt = item.end ? DateTime.fromISO(item.end, { setZone: true }) : start.plus({ minutes: 15 })
      const end = endDt.isValid && endDt > start ? endDt : start.plus({ minutes: 15 })
      lines.push(
        'BEGIN:VEVENT',
        `UID:${item.id}@jetlag-planner`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${utc(start.toISO()!)}`,
        `DTEND:${utc(end.toISO()!)}`,
        `SUMMARY:${escapeText(item.title)}`,
      )
      if (item.detail) lines.push(`DESCRIPTION:${escapeText(item.detail)}`)
      lines.push('END:VEVENT')
    }
  }
  lines.push('END:VCALENDAR')
  return lines.flatMap(fold).join('\r\n') + '\r\n'
}
