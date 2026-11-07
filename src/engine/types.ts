/**
 * Shared contract between the schedule engine and the UI.
 * Everything the UI renders comes from `Plan`. Everything the user enters is `TripInput`.
 * All instants are ISO-8601 strings WITH zone offset (e.g. "2026-12-20T21:00:00-05:00").
 * `zone` fields are IANA zone ids (e.g. "America/New_York", "Asia/Kolkata").
 */

export type IanaZone = string

export interface Airport {
  /** IATA code, e.g. "JFK" */
  code: string
  city: string
  name: string
  country: 'US' | 'IN' | 'OTHER'
  zone: IanaZone
}

export interface FlightLeg {
  /** IATA code or free text; resolved to a zone via `fromZone` */
  from: string
  fromZone: IanaZone
  to: string
  toZone: IanaZone
  /** Local wall-clock departure at `fromZone`, "YYYY-MM-DDTHH:mm" (no offset) */
  departLocal: string
  /** Local wall-clock arrival at `toZone`, "YYYY-MM-DDTHH:mm" (no offset) */
  arriveLocal: string
}

export interface SleepHabits {
  /** Usual bedtime at home, "HH:mm" 24h */
  bedtime: string
  /** Usual wake time at home, "HH:mm" 24h */
  wakeTime: string
}

export type Strategy = 'auto' | 'advance' | 'delay'

export interface TripInput {
  legs: FlightLeg[]            // 1 or 2 legs (one layover max)
  homeZone: IanaZone           // where the body clock currently is
  destZone: IanaZone           // where the user will live after arrival
  habits: SleepHabits
  /** How many days before departure to start pre-shifting (0–3). Default 2. */
  preShiftDays: number
  /** Days after arrival to keep scheduling (3–7). Default 5. */
  postArrivalDays: number
  strategy: Strategy
  /** Does the user use caffeine? If false, no caffeine items are emitted. */
  usesCaffeine: boolean
  /** Include melatonin items (user confirms it's OK for them). */
  useMelatonin: boolean
  /** Include optional supplement items (vitamin C, omega-3, B-complex, magnesium). */
  includeSupplements: boolean
}

export type ItemKind =
  | 'sleep'          // main sleep window (start..end)
  | 'wake'           // point: get up
  | 'nap_ok'         // window in which a ≤30 min nap is acceptable
  | 'light_seek'     // window: get bright light (outside if possible)
  | 'light_avoid'    // window: avoid bright light / wear blue-blocking glasses
  | 'melatonin'      // point: take low-dose melatonin
  | 'caffeine_ok'    // window: caffeine allowed
  | 'caffeine_stop'  // point: last caffeine
  | 'meal'           // point: eat (title says which meal and what kind)
  | 'fast'           // window: avoid eating (in-flight, optional/low evidence)
  | 'hydrate'        // point: reminder
  | 'supplement'     // point: optional supplement (title names it)
  | 'exercise'       // window: light movement / walk outside
  | 'flight'         // window: the flight itself (depart..arrive)
  | 'reset'          // point: destination "morning anchor": wake + light + caffeine + protein
  | 'note'           // informational, no action

export type Evidence = 'strong' | 'moderate' | 'low'

export interface PlanItem {
  id: string
  kind: ItemKind
  /** Short imperative title, e.g. "Avoid bright light (glasses on)" */
  title: string
  /** 1–2 sentence why/how. Plain language. */
  detail?: string
  /** ISO instant with offset. */
  start: string
  /** ISO instant with offset; omit for point events. */
  end?: string
  /** Zone the user is physically in during this item (for display). */
  zone: IanaZone
  evidence: Evidence
  /** True for the handful of items that matter most that day. */
  key?: boolean
}

export interface PlanDay {
  /** Calendar date in `zone`, "YYYY-MM-DD" */
  date: string
  zone: IanaZone
  /** Human label, e.g. "2 days before departure", "Travel day", "Arrival day", "Day 2 in India" */
  label: string
  phase: 'pre' | 'travel' | 'arrival' | 'post'
  /** Target bedtime/wake for this day in `zone`, "HH:mm" (wall clock), for the summary strip */
  targetBedtime: string
  targetWake: string
  /** Estimated body-clock offset from destination time at the start of this day, hours (+ = body is behind dest) */
  remainingShiftHours: number
  items: PlanItem[]
}

export interface PlanSummary {
  /** Signed hours the destination is ahead (+) of home at the relevant dates, e.g. +10.5 */
  rawShiftHours: number
  /** Strategy actually used */
  strategy: Exclude<Strategy, 'auto'>
  /** Hours the body clock must move in the chosen direction (advance: east; delay: west-around) */
  shiftToCoverHours: number
  /** Hours per day the engine assumes the clock moves (1.0 advance, 1.5 delay — CDC Yellow Book) */
  ratePerDay: number
  /** Estimated days until fully adjusted */
  estimatedDaysToAdjust: number
  /** One-paragraph plain-language explanation of the strategy choice */
  rationale: string
  /** Warnings: e.g. very short pre-shift, overnight arrival, missing melatonin consent */
  warnings: string[]
}

export interface Plan {
  input: TripInput
  summary: PlanSummary
  days: PlanDay[]
  /** Engine version for cache-busting saved plans */
  version: string
}

/** The single entry point the UI calls. Pure; deterministic for a given input. */
export type GeneratePlan = (input: TripInput) => Plan
