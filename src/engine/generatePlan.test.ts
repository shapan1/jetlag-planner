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
      if (d.phase === 'travel' || d.phase === 'arrival' || d.remainingShiftHours <= 0.5) continue
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

describe('local-day anchoring', () => {
  const routes = [['BLR', base], ['DEL', jfkDel], ['BOM', sfoBom]] as const
  for (const [name, inp] of routes) {
    it(`${name}: arrival-day sleep starts 20:00-23:59 local`, () => {
      const p = generatePlan(inp)
      const arr = p.days.find((d) => d.phase === 'arrival')!
      const sl = arr.items.find((i) => i.kind === 'sleep')!
      const h = DateTime.fromISO(sl.start, { setZone: true }).hour
      expect(h).toBeGreaterThanOrEqual(20)
      expect(sl.zone).toBe(inp.destZone)
    })
    it(`${name}: post-arrival sleep is habitual bed/wake in destination zone`, () => {
      const p = generatePlan(inp)
      for (const d of p.days.filter((x) => x.phase === 'post')) {
        const sl = d.items.find((i) => i.kind === 'sleep')!
        expect(DateTime.fromISO(sl.start, { setZone: true }).toFormat('HH:mm')).toBe('23:00')
        expect(DateTime.fromISO(sl.end!, { setZone: true }).toFormat('HH:mm')).toBe('07:00')
      }
    })
    it(`${name}: no meal/caffeine_ok in sleep, light windows in waking hours`, () => {
      const p = generatePlan(inp)
      const all = p.days.flatMap((d) => d.items)
      const sl = all.filter((i) => i.kind === 'sleep').map((i) => [DateTime.fromISO(i.start).toMillis(), DateTime.fromISO(i.end!).toMillis()])
      const inside = (t: number) => sl.some(([a, b]) => t > a && t < b)
      const overlaps = (s: number, e: number) => sl.some(([a, b]) => s < b && e > a)
      for (const i of all) {
        const s = DateTime.fromISO(i.start).toMillis()
        const e = i.end ? DateTime.fromISO(i.end).toMillis() : s
        if (i.kind === 'meal') expect(inside(s), i.title).toBe(false)
        if (i.kind === 'caffeine_ok') expect(overlaps(s, e), i.title).toBe(false)
        if ((i.kind === 'light_seek' || i.kind === 'light_avoid') && !i.title.startsWith('Glasses on / eyeshade')) {
          expect(overlaps(s, e), i.title + i.start).toBe(false)
        }
      }
    })
  }

  it('short sleep when landing in the local night after little in-flight sleep', () => {
    const inp: TripInput = { ...jfkDel, legs: [{ ...jfkDel.legs[0], departLocal: '2026-07-10T08:00', arriveLocal: '2026-07-11T01:00' }] }
    const p = generatePlan(inp)
    const all = p.days.flatMap((d) => d.items)
    expect(all.some((i) => i.title.startsWith('Sleep now until'))).toBe(true)
    for (const d of p.days) expect(d.items.filter((i) => i.kind === 'sleep').length).toBeLessThanOrEqual(1)
  })

  it('adds a sleepy-window warning', () => {
    expect(generatePlan(base).summary.warnings.join(' ')).toMatch(/First days in India you'll be sleepy around 13:00–21:00 local/)
  })
})

