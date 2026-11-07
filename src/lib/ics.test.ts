import { describe, it, expect } from 'vitest'
import type { Plan, PlanItem } from '../engine/types'
import { planToIcs } from './ics'

const mk = (id: string, kind: PlanItem['kind'], extra: Partial<PlanItem> = {}): PlanItem => ({
  id,
  kind,
  title: `Title ${id}`,
  start: '2026-12-20T21:00:00-05:00',
  zone: 'America/New_York',
  evidence: 'strong',
  ...extra,
})

const items: PlanItem[] = [
  mk('a', 'sleep', { end: '2026-12-21T05:00:00-05:00' }),
  mk('b', 'melatonin', { detail: 'Take 0.5 mg, with water; then rest\nsecond line' }),
  mk('c', 'hydrate'),
  mk('d', 'note', { key: true }),
  mk('e', 'meal'),
  mk('f', 'flight', {
    title: 'Flight ' + 'very long title, with commas; and semicolons — ünïcödé '.repeat(5),
    detail: 'x'.repeat(300),
    end: '2026-12-21T22:30:00+05:30',
  }),
]

const plan = {
  input: {} as Plan['input'],
  summary: {} as Plan['summary'],
  version: 't',
  days: [
    { date: '2026-12-20', zone: 'America/New_York', label: 'd', phase: 'pre', targetBedtime: '', targetWake: '', remainingShiftHours: 0, items },
  ],
} as Plan

describe('planToIcs', () => {
  const ics = planToIcs(plan)
  it('is a valid calendar envelope with CRLF', () => {
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('VERSION:2.0')
    expect(ics).toContain('PRODID:')
    expect(ics).toContain('CALSCALE:GREGORIAN')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/)
  })
  it('emits one VEVENT per eligible item', () => {
    // a, b, d (key), f
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(4)
    expect(ics).toContain('UID:a@jetlag-planner')
    expect(ics).not.toContain('UID:c@')
    expect(ics).not.toContain('UID:e@')
  })
  it('converts to UTC and gives point events 15 minutes', () => {
    expect(ics).toContain('DTSTART:20261221T020000Z')
    const d = ics.split('UID:d@jetlag-planner')[1]
    expect(d).toContain('DTSTART:20261221T020000Z')
    expect(d).toContain('DTEND:20261221T021500Z')
  })
  it('escapes special chars', () => {
    expect(ics).toContain('Take 0.5 mg\\, with water\; then rest\\nsecond line')
  })
  it('folds lines to at most 75 octets', () => {
    const enc = new TextEncoder()
    for (const line of ics.split('\r\n')) expect(enc.encode(line).length).toBeLessThanOrEqual(75)
  })
})
