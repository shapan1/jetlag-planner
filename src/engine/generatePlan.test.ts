import { describe, expect, it } from 'vitest'
import { DateTime } from 'luxon'
import { generatePlan } from './generatePlan'
import { SAMPLE_INPUT } from './sample'
import type { Plan, TripInput } from './types'

const base: TripInput = { ...SAMPLE_INPUT }

const jfkDel: TripInput = {
  ...base,
  legs: [{ from: 'JFK', fromZone: 'America/New_York', to: 'DEL', toZone: 'Asia/Kolkata',
    departLocal: '2026-07-10T22:00', arriveLocal: '2026-07-11T23:00' }],
}
const sfoBom: TripInput = {
  ...base,
  homeZone: 'America/Los_Angeles',
  legs: [{ from: 'SFO', fromZone: 'America/Los_Angeles', to: 'BOM', toZone: 'Asia/Kolkata',
    departLocal: '2026-12-10T21:00', arriveLocal: '2026-12-12T03:00' }],
}

const sleeps = (p: Plan) => p.days.flatMap((d) => d.items.filter((i) => i.kind === 'sleep'))

describe('strategy and raw shift', () => {
  it('JFK->BLR (EST): +10.5, delay, >= 9 days, one sleep per day, no overlap', () => {
    const p = generatePlan(base)
    expect(p.summary.rawShiftHours).toBe(10.5)
    expect(p.summary.strategy).toBe('delay')
    expect(p.summary.shiftToCoverHours).toBe(13.5)
    expect(p.summary.estimatedDaysToAdjust).toBe(9)
    expect(p.days.length).toBeGreaterThanOrEqual(9)
    for (const d of p.days) expect(d.items.filter((i) => i.kind === 'sleep')).toHaveLength(1)
    const s = sleeps(p).map((i) => [DateTime.fromISO(i.start).toMillis(), DateTime.fromISO(i.end!).toMillis()])
    s.sort((a, b) => a[0] - b[0])
    for (let i = 1; i < s.length; i++) expect(s[i][0]).toBeGreaterThanOrEqual(s[i - 1][1])
  })

  it('JFK->DEL in July (EDT): +9.5, advance, melatonin at B-90m on shifting days', () => {
    const p = generatePlan(jfkDel)
    expect(p.summary.rawShiftHours).toBe(9.5)
    expect(p.summary.strategy).toBe('advance')
    let checked = 0
    for (const d of p.days) {
      if (d.phase === 'travel' || d.remainingShiftHours <= 0) continue
      const sl = d.items.find((i) => i.kind === 'sleep')!
      const mel = d.items.find((i) => i.kind === 'melatonin')
      expect(mel, d.date).toBeDefined()
      expect(DateTime.fromISO(sl.start).toMillis() - DateTime.fromISO(mel!.start).toMillis()).toBe(90 * 60_000)
      checked++
    }
    expect(checked).toBeGreaterThan(3)
  })

  it('SFO->BOM Dec (PST): rawShift 13.5 (not -10.5), delay', () => {
    const p = generatePlan(sfoBom)
    expect(p.summary.rawShiftHours).toBe(13.5)
    expect(p.summary.strategy).toBe('delay')
    expect(p.summary.shiftToCoverHours).toBe(10.5)
    expect(p.summary.estimatedDaysToAdjust).toBe(7)
  })

  it('respects forced strategy', () => {
    expect(generatePlan({ ...base, strategy: 'advance' }).summary.strategy).toBe('advance')
    expect(generatePlan({ ...jfkDel, strategy: 'delay' }).summary.strategy).toBe('delay')
  })
})

describe('toggles', () => {
  it('usesCaffeine=false -> no caffeine items', () => {
    const p = generatePlan({ ...base, usesCaffeine: false })
    expect(p.days.flatMap((d) => d.items).filter((i) => i.kind.startsWith('caffeine'))).toHaveLength(0)
    expect(generatePlan(base).days.flatMap((d) => d.items).some((i) => i.kind === 'caffeine_stop')).toBe(true)
  })
  it('useMelatonin=false -> no melatonin items', () => {
    for (const inp of [base, jfkDel]) {
      const p = generatePlan({ ...inp, useMelatonin: false })
      expect(p.days.flatMap((d) => d.items).filter((i) => i.kind === 'melatonin')).toHaveLength(0)
    }
  })
  it('includeSupplements=false -> no supplements', () => {
    const p = generatePlan({ ...base, includeSupplements: false })
    expect(p.days.flatMap((d) => d.items).filter((i) => i.kind === 'supplement')).toHaveLength(0)
  })
})

describe('structure', () => {
  for (const [name, inp] of [['BLR', base], ['DEL', jfkDel], ['BOM', sfoBom]] as const) {
    it(`${name}: ISO with offsets, sorted, <=1 sleep, <=5 keys, remaining non-increasing`, () => {
      const p = generatePlan(inp)
      let prev = Infinity
      for (const d of p.days) {
        expect(d.items.filter((i) => i.kind === 'sleep').length).toBeLessThanOrEqual(1)
        expect(d.items.filter((i) => i.key).length).toBeLessThanOrEqual(5)
        let last = -Infinity
        for (const i of d.items) {
          const dt = DateTime.fromISO(i.start, { setZone: true })
          expect(dt.isValid).toBe(true)
          expect(i.start).toMatch(/[+-]\d\d:\d\d$|Z$/)
          if (i.end) expect(i.end).toMatch(/[+-]\d\d:\d\d$|Z$/)
          expect(dt.toMillis()).toBeGreaterThanOrEqual(last)
          last = dt.toMillis()
        }
        expect(new Set(d.items.map((i) => i.id)).size).toBe(d.items.length)
        expect(d.remainingShiftHours).toBeLessThanOrEqual(prev)
        prev = d.remainingShiftHours
      }
      expect(p.days.some((d) => d.phase === 'travel')).toBe(true)
      expect(p.days.some((d) => d.phase === 'arrival')).toBe(true)
      expect(p.summary.rationale.length).toBeGreaterThan(20)
    })
  }

  it('is deterministic', () => {
    expect(generatePlan(base)).toEqual(generatePlan(base))
  })

  it('warns when no pre-shift', () => {
    expect(generatePlan({ ...base, preShiftDays: 0 }).summary.warnings.join(' ')).toMatch(/No pre-shift/)
  })

  it('handles zero pre-shift and 3 pre-shift days', () => {
    expect(generatePlan({ ...base, preShiftDays: 0 }).days.filter((d) => d.phase === 'pre')).toHaveLength(0)
    expect(generatePlan({ ...base, preShiftDays: 3 }).days.filter((d) => d.phase === 'pre')).toHaveLength(3)
  })

  it('travel day has flight, in-flight sleep for BLR', () => {
    const t = generatePlan(base).days.find((d) => d.phase === 'travel')!
    expect(t.items.some((i) => i.kind === 'flight')).toBe(true)
    expect(t.items.some((i) => i.kind === 'hydrate')).toBe(true)
    const arr = generatePlan(base).days.find((d) => d.phase === 'arrival')!
    expect(arr.items.some((i) => i.kind === 'reset')).toBe(true)
  })
})
