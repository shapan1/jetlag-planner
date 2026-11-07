import { DateTime } from 'luxon'

export function mod(a: number, n: number): number {
  return ((a % n) + n) % n
}

/** "HH:mm" -> hours (0..24) */
export function parseHM(s: string): number {
  const [h, m] = s.split(':').map(Number)
  return (h || 0) + (m || 0) / 60
}

/**
 * Build a wall-clock instant on the calendar day `day` (any time of day) in its zone,
 * at `hours` hours after that day's local midnight. `hours` may be negative or >= 24
 * (rolls to the neighbouring date). DST-safe (calendar arithmetic, then set wall time).
 */
export function wall(day: DateTime, hours: number): DateTime {
  const totalMin = Math.round(hours * 60)
  const d = Math.floor(totalMin / 1440)
  const rem = totalMin - d * 1440
  return day
    .startOf('day')
    .plus({ days: d })
    .set({ hour: Math.floor(rem / 60), minute: rem % 60, second: 0, millisecond: 0 })
}

export function addHours(dt: DateTime, hours: number): DateTime {
  return dt.plus({ minutes: Math.round(hours * 60) })
}

export function fmtHM(dt: DateTime, zone: string): string {
  return dt.setZone(zone).toFormat('HH:mm')
}

/** 10.5 -> "10.5", 10 -> "10" */
export function fmtH(x: number): string {
  const r = Math.round(x * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}
