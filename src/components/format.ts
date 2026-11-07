import { DateTime } from 'luxon'
import type { PlanItem } from '../engine/types'

export function hhmm(iso: string, zone: string): string {
  return DateTime.fromISO(iso, { setZone: true }).setZone(zone).toFormat('HH:mm')
}

export function timeRange(item: PlanItem): string {
  const a = hhmm(item.start, item.zone)
  return item.end ? `${a} – ${hhmm(item.end, item.zone)}` : a
}

export function itemRange(item: PlanItem, flightEndZone?: string): string {
  const s = DateTime.fromISO(item.start, { setZone: true }).setZone(item.zone)
  const a = s.toFormat('HH:mm')
  if (!item.end) return a
  if (item.kind === 'flight' && flightEndZone) {
    const e = DateTime.fromISO(item.end, { setZone: true }).setZone(flightEndZone)
    const days = Math.round(e.startOf('day').diff(s.startOf('day'), 'days').days)
    const plus = days > 0 ? ` (+${days} day${days > 1 ? 's' : ''})` : days < 0 ? ` (${days} day)` : ''
    return `${a} ${s.toFormat('ZZZZ')} → ${e.toFormat('HH:mm ZZZZ')}${plus}`
  }
  const e = DateTime.fromISO(item.end, { setZone: true }).setZone(item.zone)
  const days = Math.round(e.startOf('day').diff(s.startOf('day'), 'days').days)
  return `${a} – ${e.toFormat('HH:mm')}${days > 0 ? ` (+${days})` : ''}`
}

export function zoneAbbr(iso: string, zone: string): string {
  return DateTime.fromISO(iso, { setZone: true }).setZone(zone).toFormat('ZZZZ')
}

export function signed(n: number): string {
  const r = Math.round(n * 10) / 10
  return `${r > 0 ? '+' : ''}${r}`
}

export function fmtDate(date: string, fmt: string): string {
  return DateTime.fromISO(date).toFormat(fmt)
}

/** Small stable hash of a string (djb2), base36. */
export function hashString(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export const COMMON_ZONES: string[] = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Europe/Frankfurt',
  'Europe/Istanbul',
  'Asia/Dubai',
  'Asia/Doha',
  'Asia/Kolkata',
  'Asia/Colombo',
  'Asia/Kathmandu',
  'Asia/Dhaka',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
]
