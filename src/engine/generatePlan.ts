import { DateTime } from 'luxon'
import type {
  Evidence,
  ItemKind,
  Plan,
  PlanDay,
  PlanItem,
  Strategy,
  TripInput,
} from './types'
import { addHours, fmtH, fmtHM, mod, parseHM, wall } from './time'
import { cityForCode, placeForZone } from './places'

export const ENGINE_VERSION = '1.0.0'

const ADV_RATE = 1.0
const DEL_RATE = 1.5
const PRE_RATE = 1.0

interface Raw {
  kind: ItemKind
  title: string
  detail?: string
  start: DateTime
  end?: DateTime
  evidence: Evidence
  key?: boolean
}

interface Card {
  cycle: number
  date: string
  zone: string
  label: string
  phase: PlanDay['phase']
  raws: Raw[]
  bedS?: DateTime
  bedE?: DateTime
}

const KIND_ORDER: ItemKind[] = [
  'flight', 'wake', 'reset', 'light_avoid', 'light_seek', 'melatonin', 'caffeine_ok', 'caffeine_stop',
  'meal', 'supplement', 'exercise', 'nap_ok', 'hydrate', 'fast', 'sleep', 'note',
]
const KEY_PRIORITY: ItemKind[] = ['reset', 'sleep', 'melatonin', 'light_seek', 'light_avoid']

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

export function generatePlan(input: TripInput): Plan {
  const { legs, homeZone: home, destZone: dest, habits } = input
  const bed = parseHM(habits.bedtime)
  const wakeH = parseHM(habits.wakeTime)
  let len = mod(wakeH - bed, 24)
  if (len === 0) len = 8

  const flights = legs.map((l) => ({
    leg: l,
    dep: DateTime.fromISO(l.departLocal, { zone: l.fromZone }),
    arr: DateTime.fromISO(l.arriveLocal, { zone: l.toZone }),
  }))
  const dep0 = flights[0].dep
  const landing = flights[flights.length - 1].arr
  const depMs = dep0.toMillis()
  const landMs = landing.toMillis()

  // ---- 0/1. Raw shift and strategy ------------------------------------------------------
  const rawShift = landing.setZone(dest).offset / 60 - dep0.setZone(home).offset / 60
  const e = mod(rawShift, 24) // eastward-equivalent hours
  const daysAdv = e / ADV_RATE
  const daysDel = (24 - e) / DEL_RATE
  const strategy: 'advance' | 'delay' =
    input.strategy === 'advance' || input.strategy === 'delay'
      ? input.strategy
      : daysDel < daysAdv
        ? 'delay'
        : 'advance'
  const dir = strategy === 'advance' ? -1 : 1
  const rate = strategy === 'advance' ? ADV_RATE : DEL_RATE
  const cover = strategy === 'advance' ? e : 24 - e
  const tAbs = cover

  const P = clamp(Math.round(input.preShiftDays), 0, 3)
  const post = clamp(Math.round(input.postArrivalDays), 0, 14)

  // ---- 2. Body-clock model (body clock lives on the home wall clock) --------------------
  const sAbs = (n: number): number => {
    if (n < 0) return 0
    if (n < P) return Math.min((n + 1) * PRE_RATE, tAbs)
    const hold = Math.min(P * PRE_RATE, tAbs)
    if (n === P) return hold
    return Math.min(hold + (n - P) * rate, tAbs)
  }
  const depHomeDay = dep0.setZone(home).startOf('day')
  const day0 = depHomeDay.minus({ days: P })
  const nightStart = (n: number) => wall(day0.plus({ days: n }), bed + dir * sAbs(n))

  // arrival cycle: first body-night starting at/after landing
  let a = P + 1
  while (nightStart(a).toMillis() < landMs && a < P + 80) a++
  const lastCycle = a + post
  const nights: DateTime[] = []
  for (let n = 0; n <= lastCycle; n++) nights.push(nightStart(n))
  const nightEnd = (n: number) => addHours(nights[n], len)
  const wakeOf = (n: number) => (n === 0 ? addHours(nights[0], -(24 - len)) : nightEnd(n - 1))
  const isShifting = (n: number) => tAbs > 0 && (sAbs(n) < tAbs || sAbs(n) > sAbs(n - 1))

  // ---- time axis helpers ----------------------------------------------------------------
  type Seg = { from: number; to: number; type: 'pre' | 'flight' | 'layover' | 'post' }
  const segs: Seg[] = []
  let cursor = -Infinity
  flights.forEach((f, i) => {
    segs.push({ from: cursor, to: f.dep.toMillis(), type: i === 0 ? 'pre' : 'layover' })
    segs.push({ from: f.dep.toMillis(), to: f.arr.toMillis(), type: 'flight' })
    cursor = f.arr.toMillis()
  })
  segs.push({ from: cursor, to: Infinity, type: 'post' })

  const zoneAt = (ms: number): string => {
    if (ms < depMs) return home
    for (let i = 0; i < flights.length; i++) {
      const f = flights[i]
      if (ms >= f.dep.toMillis() && ms < f.arr.toMillis()) return f.leg.fromZone
      const nextDep = flights[i + 1]?.dep.toMillis() ?? Infinity
      if (ms >= f.arr.toMillis() && ms < nextDep) return i === flights.length - 1 ? dest : f.leg.toZone
    }
    return dest
  }

  const destPlace = placeForZone(dest)
  const destCity = cityForCode(legs[legs.length - 1].to) ?? destPlace
  const homePlace = placeForZone(home)

  const lightTitle = (kind: 'light_seek' | 'light_avoid', st: DateTime, en: DateTime): string => {
    const mid = DateTime.fromMillis((st.toMillis() + en.toMillis()) / 2, { zone: zoneAt(st.toMillis()) })
    const day = mid.hour >= 6 && mid.hour < 18
    if (kind === 'light_avoid') return day ? 'Sunglasses on: avoid bright light' : 'Dim lights, glasses on, no bright screens'
    return day ? 'Get outside into daylight' : 'Bright indoor light (lamps/screens on)'
  }

  // ---- 3. Items per body-clock cycle ----------------------------------------------------
  const cycleItems = (n: number): Raw[] => {
    const N = nights[n]
    const W = wakeOf(n)
    const shifting = isShifting(n)
    const out: Raw[] = []
    const push = (r: Raw) => out.push(r)

    push({ kind: 'wake', title: 'Get up', start: W, evidence: 'strong',
      detail: 'A steady wake time anchors your body clock; get light and move soon after.' })

    // light
    if (!shifting) {
      push({ kind: 'light_seek', title: 'Get morning daylight', start: W, end: addHours(W, 2), evidence: 'strong', key: true,
        detail: 'CDC: morning light keeps your clock locked to the new time zone.' })
    } else if (strategy === 'advance') {
      push({ kind: 'light_seek', title: lightTitle('light_seek', W, addHours(W, 3)), start: W, end: addHours(W, 3), evidence: 'strong', key: true,
        detail: "CDC: light soon after your body's temperature low advances the clock. Outdoors is best." })
      push({ kind: 'light_avoid', title: lightTitle('light_avoid', addHours(N, -3), N), start: addHours(N, -3), end: N, evidence: 'strong', key: true,
        detail: 'Evening light delays the clock, the opposite of what you want. Dim lights and use blue-blocking glasses.' })
    } else {
      push({ kind: 'light_seek', title: lightTitle('light_seek', addHours(N, -4), addHours(N, -1)), start: addHours(N, -4), end: addHours(N, -1), evidence: 'strong', key: true,
        detail: "CDC: light before your body's temperature low delays the clock. Stay in bright light until a bit before bed." })
      push({ kind: 'light_avoid', title: lightTitle('light_avoid', W, addHours(W, 3)), start: W, end: addHours(W, 3), evidence: 'strong', key: true,
        detail: 'Light soon after waking would pull your clock earlier, the wrong way for this plan.' })
    }

    // melatonin
    if (input.useMelatonin) {
      if (shifting && strategy === 'advance') {
        const t = addHours(N, -1.5)
        const bodyHour = t.setZone(home).hour + t.setZone(home).minute / 60
        if (!(bodyHour >= 0 && bodyHour < 5)) {
          push({ kind: 'melatonin', title: 'Take 0.5–1 mg melatonin', start: t, evidence: 'moderate', key: true,
            detail: 'CDC: a low dose about 90 minutes before bed helps shift your clock earlier. More is not better.' })
        }
      } else if (shifting && strategy === 'delay' && n > P) {
        push({ kind: 'melatonin', title: 'Optional: 0.5 mg melatonin as a sleep aid', start: addHours(N, -0.5), evidence: 'low',
          detail: 'Melatonin does not help delay your clock, but a small dose at bedtime may help you fall asleep.' })
      }
    }

    // caffeine
    const cStop = addHours(N, -6)
    if (input.usesCaffeine && cStop.toMillis() > addHours(W, 1).toMillis()) {
      push({ kind: 'caffeine_ok', title: 'Caffeine OK', start: W, end: cStop, evidence: 'moderate',
        detail: 'CDC: caffeine in daylight hours can help alertness while you adjust.' })
      push({ kind: 'caffeine_stop', title: 'Last caffeine', start: cStop, evidence: 'moderate',
        detail: 'Stop about 6 hours before bed so it does not cost you sleep.' })
    }

    // nap
    const napS = addHours(W, 2)
    const napE = addHours(N, -8)
    if (napE.toMillis() - napS.toMillis() >= 3600_000) {
      push({ kind: 'nap_ok', title: 'Short nap OK (≤30 min)', start: napS, end: napE, evidence: 'moderate',
        detail: 'Keep it to 20–30 minutes and finish at least 8 hours before bed (CDC, Sleep Foundation).' })
    }

    // meals, supplements, exercise
    const dinner = addHours(N, -3)
    const bf = addHours(W, 0.5)
    const lunch = addHours(W, 5)
    const dMs = dinner.toMillis()
    if (bf.toMillis() < dMs - 4 * 3600_000) {
      push({ kind: 'meal', title: 'Protein-forward breakfast', start: bf, evidence: 'low',
        detail: 'Meal timing is a weak clock cue (limited evidence), but a protein breakfast helps you feel awake.' })
      if (input.includeSupplements) {
        push({ kind: 'supplement', title: 'Optional: B-complex (B6/B12) with breakfast', start: bf, evidence: 'low',
          detail: 'Low evidence; sometimes used for energy. Skip if you take other B vitamins.' })
      }
    }
    if (lunch.toMillis() < dMs - 2.5 * 3600_000) {
      push({ kind: 'meal', title: 'Balanced lunch', start: lunch, evidence: 'low',
        detail: 'Eat at local daytime hours when you can; it nudges your clock very gently.' })
      if (input.includeSupplements) {
        push({ kind: 'supplement', title: 'Optional: vitamin C 500 mg + omega-3 1 g with lunch', start: lunch, evidence: 'low',
          detail: 'Low evidence; sometimes used to ease travel fatigue.' })
      }
    }
    if (dinner.toMillis() > addHours(W, 1).toMillis()) {
      push({ kind: 'meal', title: 'Lighter, low-carb dinner', start: dinner, evidence: 'low',
        detail: 'A lighter meal before bed makes falling asleep easier.' })
      if (input.includeSupplements) {
        push({ kind: 'supplement', title: 'Optional: magnesium 200–300 mg with dinner', start: dinner, evidence: 'low',
          detail: 'Low evidence; some people find it relaxing at bedtime.' })
      }
    }
    if (strategy === 'delay' && shifting) {
      push({ kind: 'exercise', title: 'Walk outside', start: addHours(N, -4), end: addHours(N, -3), evidence: 'low',
        detail: 'Light movement during your light window adds a small extra cue.' })
    } else {
      push({ kind: 'exercise', title: 'Walk outside', start: addHours(W, 0.5), end: addHours(W, 1.5), evidence: 'low',
        detail: 'Light movement during your light window adds a small extra cue.' })
    }
    return out
  }

  // ---- routing of items around the flights ---------------------------------------------
  const fmtLocal = (dt: DateTime) => fmtHM(dt, zoneAt(dt.toMillis()))
  const FLIGHT_POINT_OK: ItemKind[] = ['caffeine_stop', 'melatonin']
  type Routed = { card: 'travel' | 'arrival'; raw: Raw }
  const route = (raw: Raw): Routed[] => {
    const s = raw.start.toMillis()
    if (!raw.end) {
      const seg = segs.find((sg) => s >= sg.from && s < sg.to)!
      if (seg.type === 'post') return [{ card: 'arrival', raw }]
      if (seg.type === 'flight') return FLIGHT_POINT_OK.includes(raw.kind) ? [{ card: 'travel', raw }] : []
      return [{ card: 'travel', raw }]
    }
    const eMs = raw.end.toMillis()
    const res: Routed[] = []
    for (const sg of segs) {
      const f = Math.max(s, sg.from)
      const t = Math.min(eMs, sg.to)
      if (t - f < 10 * 60_000) continue
      const piece = (): Raw => ({ ...raw, start: DateTime.fromMillis(f, { zone: raw.start.zone }), end: DateTime.fromMillis(t, { zone: raw.start.zone }) })
      if (sg.type === 'flight') {
        if (raw.kind === 'light_avoid') {
          res.push({ card: 'travel', raw: { ...piece(), title: 'Glasses on / eyeshade; dim your screen', key: false,
            detail: 'It is the wrong time of your body clock for bright light, so keep the cabin light and screens low.' } })
        }
      } else if (sg.type === 'post') {
        const p = piece()
        if (raw.kind === 'light_avoid' && f > s) {
          p.title = `Wear sunglasses from the gate until ${fmtLocal(p.end!)}`
          p.key = true
          p.detail = 'You land while bright light would push your body clock the wrong way. Keep sunglasses on until then.'
        }
        res.push({ card: 'arrival', raw: p })
      } else {
        res.push({ card: 'travel', raw: piece() })
      }
    }
    return res
  }

  // ---- 5. Cards -------------------------------------------------------------------------
  const cards: Card[] = []
  for (let n = 0; n < P; n++) {
    const k = P - n
    cards.push({
      cycle: n, zone: home, phase: 'pre', raws: [],
      date: day0.plus({ days: n }).toISODate()!,
      label: k === 1 ? 'Day before departure' : `${k} days before departure`,
    })
  }
  const travel: Card = {
    cycle: P, zone: legs[0].fromZone, phase: 'travel', raws: [], label: 'Travel day',
    date: dep0.toISODate()!,
  }
  cards.push(travel)
  const arrDate = landing.setZone(dest).startOf('day')
  const arrival: Card = {
    cycle: a, zone: dest, phase: 'arrival', raws: [], label: 'Arrival day', date: arrDate.toISODate()!,
  }
  cards.push(arrival)
  for (let k = 1; k <= post; k++) {
    cards.push({
      cycle: a + k, zone: dest, phase: 'post', raws: [],
      date: arrDate.plus({ days: k }).toISODate()!,
      label: `Day ${k + 1} in ${destCity}`,
    })
  }

  // pre-departure cycles: habitual sleep shifted by the strategy
  for (const c of cards) {
    if (c.phase !== 'pre') continue
    c.raws.push(...cycleItems(c.cycle))
    c.bedS = nights[c.cycle]
    c.bedE = nightEnd(c.cycle)
    c.raws.push({ kind: 'sleep', title: 'Sleep window', start: c.bedS, end: c.bedE, evidence: 'strong', key: true,
      detail: `Aim for about ${fmtH(len)} hours in a dark, cool room. Bedtime moves about 1 h a day toward your target.` })
  }
  // cycles P..a feed the travel card through the router (arrival is built from the local day below)
  for (let n = P; n <= a; n++) {
    for (const r of cycleItems(n)) {
      if (r.kind === 'wake' && n >= P + 1 && r.start.toMillis() < landMs) continue // replaced by in-flight wake below
      for (const x of route(r)) if (x.card === 'travel') travel.raws.push(x.raw)
    }
  }

  // flights
  flights.forEach((f) => {
    const from = cityForCode(f.leg.from) ?? f.leg.from
    const to = cityForCode(f.leg.to) ?? f.leg.to
    travel.raws.push({ kind: 'flight', title: `Flight ${f.leg.from} → ${f.leg.to}`, start: f.dep, end: f.arr, evidence: 'strong',
      detail: `${from} to ${to}. Keep this block clear of heavy meals and alcohol.` })
  })
  travel.raws.push({ kind: 'note', title: 'No alcohol; avoid caffeine on board except as scheduled', start: dep0, evidence: 'moderate',
    detail: 'Alcohol and late caffeine fragment sleep and dehydrate you (CDC, Sleep Foundation).' })

  // in-flight sleep decision
  const overlapH = (s: DateTime, en: DateTime, f: (typeof flights)[number]) =>
    Math.max(0, Math.min(en.toMillis(), f.arr.toMillis()) - Math.max(s.toMillis(), f.dep.toMillis())) / 3600_000
  let bestN = -1
  let bestF = flights[0]
  let bestOv = 0
  for (let n = P; n < a; n++) {
    for (const f of flights) {
      const ov = overlapH(nights[n], nightEnd(n), f)
      if (ov > bestOv) { bestOv = ov; bestN = n; bestF = f }
    }
  }
  let inFlightSleep: { start: DateTime; end: DateTime } | undefined
  if (bestOv >= 3) {
    let s = DateTime.fromMillis(Math.max(nights[bestN].toMillis(), addHours(bestF.dep, 1).toMillis()))
    let en = DateTime.fromMillis(Math.min(nightEnd(bestN).toMillis(), addHours(bestF.arr, -1).toMillis()))
    if (en.toMillis() - s.toMillis() < 3600_000) {
      s = DateTime.fromMillis(Math.max(nights[bestN].toMillis(), bestF.dep.toMillis()))
      en = DateTime.fromMillis(Math.min(nightEnd(bestN).toMillis(), bestF.arr.toMillis()))
    }
    inFlightSleep = { start: s, end: en }
    travel.raws.push({ kind: 'sleep', title: 'Sleep on the plane', start: s, end: en, evidence: 'strong', key: true,
      detail: 'This is your body-clock night. Eyeshade, earplugs and a dim screen help.' })
    travel.raws.push({ kind: 'wake', title: 'Wake up', start: en, evidence: 'strong',
      detail: 'Stretch, drink water and keep the cabin light low or bright as your light windows say.' })
  } else if (nights[P].toMillis() >= landMs || nightEnd(P).toMillis() <= depMs) {
    travel.raws.push({ kind: 'sleep', title: 'Sleep window', start: nights[P], end: nightEnd(P), evidence: 'strong', key: true,
      detail: `Aim for about ${fmtH(len)} hours in a dark, cool room.` })
  } else {
    travel.raws.push({ kind: 'note', title: 'Stay awake on this flight; nap ≤30 min only', start: dep0, end: landing, evidence: 'moderate',
      detail: "Your body-clock night is not on the plane, so keep sleep short and save it for the destination night (CDC)." })
  }
  // hydrate
  travel.raws.push({ kind: 'hydrate', title: 'Drink water before you board', start: addHours(dep0, -1), evidence: 'low',
    detail: 'Cabin air is dry; start hydrated.' })
  for (let t = addHours(dep0, 3); t.toMillis() < landMs - 3600_000; t = addHours(t, 3)) {
    if (inFlightSleep && t.toMillis() >= inFlightSleep.start.toMillis() && t.toMillis() < inFlightSleep.end.toMillis()) continue
    travel.raws.push({ kind: 'hydrate', title: 'Drink water', start: t, evidence: 'low', detail: 'A glass every few hours helps with dry cabin air.' })
  }

  // ---- Arrival and post days: sleep and daily routine anchored to the LOCAL day ----------
  const bedUp = bed < wakeH ? bed + 24 : bed
  const Lday = landing.setZone(dest).startOf('day')
  const bedAt = (dd: DateTime) => wall(dd, bedUp)
  let nightDd: DateTime | undefined
  for (const dd of [Lday.minus({ days: 1 }), Lday]) {
    const b = bedAt(dd).toMillis()
    if (b - 2 * 3600_000 <= landMs && landMs < b + len * 3600_000 - 3600_000) { nightDd = dd; break }
  }
  const inFlightHours = inFlightSleep ? (inFlightSleep.end.toMillis() - inFlightSleep.start.toMillis()) / 3600_000 : 0
  const shortNeeded = !!nightDd && inFlightHours < 4
  let arrDd: DateTime = Lday
  if (shortNeeded) arrDd = nightDd!.plus({ days: 1 })
  else {
    for (let i = -1; i <= 3; i++) {
      const dd = Lday.plus({ days: i })
      if (bedAt(dd).toMillis() >= landMs) { arrDd = dd; break }
    }
  }
  const hw0 = addHours(bedAt(Lday.minus({ days: 1 })), len)
  let shortSleep: { st: DateTime; en: DateTime } | undefined
  if (shortNeeded) {
    const st = addHours(landing, 1)
    let en = addHours(bedAt(nightDd!), len)
    if (en.toMillis() - st.toMillis() < 5 * 3600_000) en = addHours(st, 5)
    shortSleep = { st, en }
  }
  const anchorArr = shortSleep ? shortSleep.en : hw0
  const lwArr = DateTime.fromMillis(Math.max(landMs, anchorArr.toMillis()))
  const nominalBed = bedAt(arrDd)
  const lastWake = inFlightSleep ? inFlightSleep.end : wakeOf(P)
  const earlier =
    !shortSleep && nominalBed.toMillis() - lastWake.toMillis() > 16 * 3600_000 && addHours(nominalBed, -1).toMillis() > landMs
  const arrBedStart = earlier ? addHours(nominalBed, -1) : nominalBed

  const localDay = (c: Card, lw: DateTime, anchor: DateTime, lb: DateTime, isArr: boolean): Raw | undefined => {
    const out = c.raws
    const lwM = lw.toMillis()
    const lbM = lb.toMillis()
    const okDay = (t: DateTime, pad = 0) => t.toMillis() >= lwM + pad && t.toMillis() < lbM
    const rem = tAbs - sAbs(c.cycle - 1)
    const converged = rem <= 0.5

    if (!isArr || lwM > landMs) {
      out.push({ kind: 'wake', title: 'Get up', start: lw, evidence: 'strong',
        detail: 'A steady wake time anchors your body clock; get light and move soon after.' })
    }
    // caffeine
    const cStop = addHours(lb, -6)
    const cStart = DateTime.fromMillis(Math.max(anchor.toMillis(), lwM))
    if (input.usesCaffeine && cStop.toMillis() - cStart.toMillis() >= 45 * 60_000) {
      out.push({ kind: 'caffeine_ok', title: 'Caffeine OK', start: cStart, end: cStop, evidence: 'moderate',
        detail: 'CDC: caffeine in local daytime can help alertness while you adjust.' })
      out.push({ kind: 'caffeine_stop', title: 'Last caffeine', start: cStop, evidence: 'moderate',
        detail: 'Stop about 6 hours before bed so it does not cost you sleep.' })
    }
    // nap
    const napS = DateTime.fromMillis(Math.max(addHours(anchor, 2).toMillis(), lwM))
    const napE = addHours(lb, -8)
    if (napE.toMillis() - napS.toMillis() >= 45 * 60_000) {
      out.push({ kind: 'nap_ok', title: 'Short nap OK (≤30 min)', start: napS, end: napE, evidence: 'moderate',
        detail: 'Keep it to 20–30 minutes and finish at least 8 hours before bed (CDC, Sleep Foundation).' })
    }
    // meals
    const bf = addHours(anchor, 0.5)
    const lunch = addHours(anchor, 5)
    const dinner = addHours(lb, -3)
    if (okDay(bf, 0) && bf.toMillis() < dinner.toMillis() - 4 * 3600_000) {
      out.push({ kind: 'meal', title: 'Protein-forward breakfast', start: bf, evidence: 'low',
        detail: 'Meal timing is a weak clock cue (limited evidence), but a protein breakfast helps you feel awake.' })
      if (input.includeSupplements) out.push({ kind: 'supplement', title: 'Optional: B-complex (B6/B12) with breakfast', start: bf, evidence: 'low',
        detail: 'Low evidence; sometimes used for energy. Skip if you take other B vitamins.' })
    }
    if (okDay(lunch, 0) && lunch.toMillis() < dinner.toMillis() - 2.5 * 3600_000) {
      out.push({ kind: 'meal', title: 'Balanced lunch', start: lunch, evidence: 'low',
        detail: 'Eat at local daytime hours; it nudges your clock very gently.' })
      if (input.includeSupplements) out.push({ kind: 'supplement', title: 'Optional: vitamin C 500 mg + omega-3 1 g with lunch', start: lunch, evidence: 'low',
        detail: 'Low evidence; sometimes used to ease travel fatigue.' })
    }
    if (okDay(dinner, 15 * 60_000)) {
      out.push({ kind: 'meal', title: 'Lighter, low-carb dinner', start: dinner, evidence: 'low',
        detail: 'A lighter meal before bed makes falling asleep easier.' })
      if (input.includeSupplements) out.push({ kind: 'supplement', title: 'Optional: magnesium 200–300 mg with dinner', start: dinner, evidence: 'low',
        detail: 'Low evidence; some people find it relaxing at bedtime.' })
    }

    // light: body-clock windows clipped to the local waking period
    const bodyWin = (cc: number, kind: 'light_seek' | 'light_avoid'): [DateTime, DateTime] => {
      const N = nights[cc]
      const W = wakeOf(cc)
      if (strategy === 'advance') return kind === 'light_seek' ? [W, addHours(W, 3)] : [addHours(N, -3), N]
      return kind === 'light_seek' ? [addHours(N, -4), addHours(N, -1)] : [W, addHours(W, 3)]
    }
    let seekItem: Raw | undefined
    for (const kind of ['light_seek', 'light_avoid'] as const) {
      if (converged && kind === 'light_avoid') continue
      let best: { s: number; e: number; gate: boolean } | undefined
      const cands: Array<[DateTime, DateTime]> = []
      if (converged) cands.push([DateTime.fromMillis(Math.max(anchor.toMillis(), lwM)), addHours(DateTime.fromMillis(Math.max(anchor.toMillis(), lwM)), 2)])
      else for (let cc = c.cycle - 1; cc <= c.cycle + 1; cc++) if (cc >= 0 && cc <= lastCycle) cands.push(bodyWin(cc, kind))
      for (const [ws, we] of cands) {
        const s2 = Math.max(ws.toMillis(), lwM)
        const e2 = Math.min(we.toMillis(), lbM)
        if (e2 - s2 < 45 * 60_000) continue
        if (!best || e2 - s2 > best.e - best.s) best = { s: s2, e: e2, gate: isArr && ws.toMillis() < landMs && s2 === landMs }
      }
      if (!best) continue
      const st = DateTime.fromMillis(best.s, { zone: dest })
      const en = DateTime.fromMillis(best.e, { zone: dest })
      let title: string
      let detail: string
      if (converged) {
        title = 'Get morning daylight'
        detail = 'CDC: morning light keeps your clock locked to the new time zone.'
      } else if (kind === 'light_seek') {
        title = lightTitle('light_seek', st, en)
        detail = strategy === 'advance'
          ? "CDC: light in your body's morning, soon after its temperature low, advances the clock."
          : "CDC: light in your body's evening, before its temperature low, delays the clock."
      } else {
        title = best.gate ? `Wear sunglasses from the gate until ${fmtHM(en, dest)}` : lightTitle('light_avoid', st, en)
        detail = strategy === 'advance'
          ? "This is your body's evening; light now would delay the clock, the wrong way for this plan."
          : "This is your body's morning; light now would advance the clock, the wrong way for this plan."
      }
      const r: Raw = { kind, title, detail, start: st, end: en, evidence: 'strong', key: true }
      out.push(r)
      if (kind === 'light_seek') seekItem = r
    }
    if (seekItem && /daylight/.test(seekItem.title)) {
      out.push({ kind: 'exercise', title: 'Walk outside', start: seekItem.start, end: DateTime.fromMillis(Math.min(seekItem.start.toMillis() + 3600_000, seekItem.end!.toMillis())),
        evidence: 'low', detail: 'Light movement during your light window adds a small extra cue.' })
    }

    // melatonin
    if (input.useMelatonin && rem > 0.5) {
      if (strategy === 'advance') {
        const t = addHours(lb, -1.5)
        const hb = t.setZone(home)
        const bodyHour = hb.hour + hb.minute / 60
        if (!(bodyHour >= 0 && bodyHour < 5) && t.toMillis() > Math.max(lwM, isArr ? landMs : 0)) {
          out.push({ kind: 'melatonin', title: 'Take 0.5–1 mg melatonin', start: t, evidence: 'moderate', key: true,
            detail: 'CDC: a low dose about 90 minutes before bed helps shift your clock earlier. More is not better.' })
        }
      } else {
        const t = addHours(lb, -0.5)
        if (t.toMillis() > lwM) out.push({ kind: 'melatonin', title: 'Optional: 0.5 mg melatonin as a sleep aid', start: t, evidence: 'low',
          detail: 'Melatonin does not help delay your clock, but a small dose at bedtime may help you fall asleep.' })
      }
    }

    if (isArr) {
      // morning anchor
      let resetAt: DateTime | undefined
      if (lwM > landMs) resetAt = lw
      else if (landMs < addHours(lb, -6).toMillis() && landMs >= hw0.toMillis()) resetAt = addHours(landing, 0.25)
      else if (landMs < hw0.toMillis()) resetAt = hw0
      let reset: Raw | undefined
      if (resetAt && resetAt.toMillis() < lbM) {
        reset = { kind: 'reset', title: 'Morning anchor: daylight, coffee, protein breakfast', start: resetAt, evidence: 'strong', key: true,
          detail: 'Get outside in daylight, have a coffee and a protein-rich breakfast. Light plus caffeine is the strongest local cue (CDC).' }
        out.push(reset)
      }
      out.push({ kind: 'hydrate', title: 'Drink water after landing', start: addHours(landing, 0.5), evidence: 'low', detail: 'Rehydrate after the flight.' })
      if (!shortSleep) {
        const napCut = addHours(lb, -8)
        const cut = napCut.toMillis() > lwM + 45 * 60_000 ? ` — nap ≤30 min allowed before ${fmtHM(napCut, dest)}` : ''
        out.push({ kind: 'note', title: `Stay awake until ${fmtHM(lb, dest)} tonight${cut}`, start: lw, end: lb, evidence: 'moderate',
          detail: 'Going to bed at the local time is the quickest way to lock in the new schedule (CDC).' })
      }
      return reset
    }
    return undefined
  }

  // arrival card
  arrival.bedS = arrBedStart
  arrival.bedE = addHours(nominalBed, len)
  arrival.raws.push({ kind: 'sleep', title: 'Sleep window', start: arrBedStart, end: arrival.bedE, evidence: 'strong', key: true,
    detail: `Local night: about ${fmtH(len)} hours in a dark, cool room.${earlier ? ' Up to an hour early because you have been awake a long time.' : ''}` })
  const arrReset = localDay(arrival, lwArr, anchorArr, arrBedStart, true)
  if (shortSleep) {
    const t = `Sleep now until ${fmtHM(shortSleep.en, dest)}`
    const detail = 'You land in the local night after little sleep on the plane; a short sleep now, then get up at the usual time.'
    if (!travel.raws.some((r) => r.kind === 'sleep')) {
      travel.raws.push({ kind: 'sleep', title: t, start: shortSleep.st, end: shortSleep.en, evidence: 'moderate', key: true, detail })
    } else {
      arrival.raws.push({ kind: 'nap_ok', title: t, start: shortSleep.st, end: shortSleep.en, evidence: 'moderate', detail })
    }
  }
  // post cards
  cards.filter((c) => c.phase === 'post').forEach((c, i) => {
    const k = i + 1
    const bs = bedAt(arrDd.plus({ days: k }))
    const prevEnd = addHours(bedAt(arrDd.plus({ days: k - 1 })), len)
    c.bedS = bs
    c.bedE = addHours(bs, len)
    c.raws.push({ kind: 'sleep', title: 'Sleep window', start: bs, end: c.bedE, evidence: 'strong', key: true,
      detail: `Habitual bedtime in local time: about ${fmtH(len)} hours in a dark, cool room.` })
    localDay(c, prevEnd, prevEnd, bs, false)
  })

  // optional fast
  const fastEnd = DateTime.fromMillis(Math.min((arrReset?.start ?? lwArr).toMillis(), addHours(dep0, 16).toMillis()))
  if (fastEnd.toMillis() > addHours(dep0, 2).toMillis()) {
    travel.raws.push({ kind: 'fast', title: 'Optional: skip plane meals; drink water', start: dep0, end: fastEnd, evidence: 'low',
      detail: 'Limited evidence (Forbes-Robertson 2012) that fasting then eating a morning meal helps; skip it if it makes you feel worse.' })
  }

  // ---- build days -----------------------------------------------------------------------
  const days: PlanDay[] = cards.map((c) => {
    const prev = sAbs(c.cycle - 1)
    const sorted = [...c.raws].sort(
      (x, y) => x.start.toMillis() - y.start.toMillis() || KIND_ORDER.indexOf(x.kind) - KIND_ORDER.indexOf(y.kind),
    )
    // key cap
    let keys = 0
    const order = [...sorted].sort((x, y) => KEY_PRIORITY.indexOf(x.kind) - KEY_PRIORITY.indexOf(y.kind))
    const allowed = new Set<Raw>()
    for (const r of order) if (r.key && keys < 5) { allowed.add(r); keys++ }
    const items: PlanItem[] = sorted.map((r, i) => {
      const zone = zoneAt(r.start.toMillis())
      const item: PlanItem = {
        id: `${c.date}-${r.kind}-${i}`,
        kind: r.kind,
        title: r.title,
        start: r.start.setZone(zone).toISO()!,
        zone,
        evidence: r.evidence,
      }
      if (r.detail) item.detail = r.detail
      if (r.end) item.end = r.end.setZone(zone).toISO()!
      if (allowed.has(r)) item.key = true
      return item
    })
    return {
      date: c.date,
      zone: c.zone,
      label: c.label,
      phase: c.phase,
      targetBedtime: fmtHM(c.bedS ?? nights[c.cycle], c.zone),
      targetWake: fmtHM(c.bedE ?? nightEnd(c.cycle), c.zone),
      remainingShiftHours: Math.round(Math.max(0, tAbs - prev) * 10) / 10,
      items,
    }
  })

  // ---- 6. Summary -----------------------------------------------------------------------
  const estDays = Math.ceil(cover / rate - 1e-9)
  const ceilAdv = Math.ceil(daysAdv - 1e-9)
  const ceilDel = Math.ceil(daysDel - 1e-9)
  const ahead = rawShift >= 0
  const diffTxt = `${destPlace} is ${fmtH(Math.abs(rawShift))} hours ${ahead ? 'ahead of' : 'behind'} ${homePlace}.`
  const optTxt =
    `Shifting earlier at ~1 h/day would take about ${ceilAdv} days; shifting later 'the long way round' ` +
    `(${fmtH(24 - e)} h at ~1.5 h/day) takes about ${ceilDel} days`
  const forced = input.strategy !== 'auto'
  const rationale = `${diffTxt} ${optTxt}, so ${forced ? 'as you chose, ' : ''}this plan ${strategy === 'delay' ? 'delays' : 'advances'} your clock.`

  const warnings: string[] = []
  if (P === 0) warnings.push('No pre-shift: expect a tougher first 2 days')
  if (len < 6 || len > 10) warnings.push('Unusual sleep length; check your times')
  const landBodyH = landing.setZone(home).hour + landing.setZone(home).minute / 60
  if (landBodyH >= 0 && landBodyH < 5) {
    warnings.push(`You land in the middle of your body's night; the plan keeps you up until ${fmtHM(nights[a], dest)}`)
  }
  const landLocalH = landing.hour
  if (landLocalH >= 22 || landLocalH < 5) {
    warnings.push('You land overnight at your destination; consider a hotel booking from the night before')
  }
  if (tAbs > 0.5) {
    for (let n = P; n <= lastCycle; n++) {
      if (nightEnd(n).toMillis() > landMs) {
        warnings.push(`First days in ${destPlace} you'll be sleepy around ${fmtHM(nights[n], dest)}–${fmtHM(nightEnd(n), dest)} local; short naps only`)
        break
      }
    }
  }
  if (!input.useMelatonin && strategy === 'advance' && tAbs > 0) {
    warnings.push('Melatonin is turned off: shifting earlier will be slower without it')
  }
  if (tAbs > 0 && tAbs <= 2) warnings.push('Small time difference: the plan is light-touch')

  return {
    input,
    version: ENGINE_VERSION,
    summary: {
      rawShiftHours: rawShift,
      strategy,
      shiftToCoverHours: cover,
      ratePerDay: rate,
      estimatedDaysToAdjust: estDays,
      rationale,
      warnings,
    },
    days,
  }
}

export type { Strategy }
