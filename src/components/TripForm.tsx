import { useState } from 'react'
import { DateTime } from 'luxon'
import type { FlightLeg, Strategy, TripInput } from '../engine/types'
import { SAMPLE_INPUT } from '../engine/sample'
import { findAirport } from '../data/airports'
import AirportField from './AirportField'
import { COMMON_ZONES } from './format'

interface Props {
  initial: TripInput
  onBuild: (input: TripInput) => void
}

export const MAX_LEGS = 4

export const BLANK_LEG: FlightLeg = {
  from: '',
  fromZone: 'America/New_York',
  to: '',
  toZone: 'Asia/Kolkata',
  departLocal: '',
  arriveLocal: '',
}

export const BLANK_INPUT: TripInput = {
  legs: [BLANK_LEG],
  homeZone: 'America/New_York',
  destZone: 'Asia/Kolkata',
  habits: { bedtime: '23:00', wakeTime: '07:00' },
  preShiftDays: 2,
  postArrivalDays: 5,
  strategy: 'auto',
  usesCaffeine: true,
  useMelatonin: false,
  includeSupplements: false,
}

function validate(input: TripInput): Record<string, string> {
  const errs: Record<string, string> = {}
  let prevArrive: DateTime | null = null
  input.legs.forEach((leg, i) => {
    if (!leg.from.trim()) errs[`from${i}`] = 'Choose where this flight departs from.'
    if (!leg.to.trim()) errs[`to${i}`] = 'Choose where this flight lands.'
    const dep = DateTime.fromISO(leg.departLocal, { zone: leg.fromZone })
    const arr = DateTime.fromISO(leg.arriveLocal, { zone: leg.toZone })
    if (!leg.departLocal || !dep.isValid) errs[`dep${i}`] = 'Enter the departure date and time.'
    if (!leg.arriveLocal || !arr.isValid) errs[`arr${i}`] = 'Enter the arrival date and time.'
    if (dep.isValid && arr.isValid) {
      if (arr <= dep) errs[`arr${i}`] = 'Arrival must be after departure (both in local airport time).'
      if (prevArrive && dep < prevArrive) errs[`dep${i}`] = 'This flight must leave after the previous one lands.'
      prevArrive = arr
    }
  })
  if (!input.habits.bedtime) errs.bed = 'Enter your usual bedtime.'
  if (!input.habits.wakeTime) errs.wake = 'Enter your usual wake time.'
  return errs
}

export default function TripForm({ initial, onBuild }: Props) {
  const [input, setInput] = useState<TripInput>(initial)
  const [homeTouched, setHomeTouched] = useState(false)
  const [destTouched, setDestTouched] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const apply = (next: TripInput, home = homeTouched, dest = destTouched) => {
    const legs = next.legs
    setInput({
      ...next,
      homeZone: home ? next.homeZone : legs[0].fromZone,
      destZone: dest ? next.destZone : legs[legs.length - 1].toZone,
    })
  }

  const setLeg = (i: number, patch: Partial<FlightLeg>) => {
    const legs = input.legs.map((l, j) => (j === i ? { ...l, ...patch } : l))
    apply({ ...input, legs })
  }

  const addLeg = () => {
    if (input.legs.length >= MAX_LEGS) return
    const last = input.legs[input.legs.length - 1]
    const next: FlightLeg = {
      from: last.to,
      fromZone: last.toZone,
      to: '',
      toZone: input.destZone,
      departLocal: '',
      arriveLocal: '',
    }
    apply({ ...input, legs: [...input.legs, next] })
  }

  const removeLeg = (i: number) => apply({ ...input, legs: input.legs.filter((_, j) => j !== i) })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate(input)
    setErrors(errs)
    if (Object.keys(errs).length === 0) onBuild(input)
    else {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
    }
  }

  const loadExample = () => {
    setErrors({})
    setHomeTouched(false)
    setDestTouched(false)
    setInput(SAMPLE_INPUT)
    onBuild(SAMPLE_INPUT)
  }

  const zoneOptions = (z: string) => (COMMON_ZONES.includes(z) ? COMMON_ZONES : [z, ...COMMON_ZONES])
  const err = (k: string) =>
    errors[k] ? (
      <p className="error" role="alert" id={`err-${k}`}>
        {errors[k]}
      </p>
    ) : null
  const inv = (k: string) => (errors[k] ? { 'aria-invalid': true as const, 'aria-describedby': `err-${k}` } : {})

  return (
    <form className="form" onSubmit={submit} noValidate>
      <h1 className="title">Plan your jet lag</h1>
      <p className="lede">
        Tell us your flights and sleep habits. We build a day-by-day plan for light, sleep, caffeine and more.
      </p>

      {input.legs.map((leg, i) => (
        <fieldset key={i} className="card">
          <legend>{input.legs.length > 1 ? `Flight ${i + 1}` : 'Your flight'}</legend>
          <AirportField
            id={`from${i}`}
            label="From"
            code={leg.from}
            zone={leg.fromZone}
            onChange={(code, zone) => setLeg(i, { from: code, fromZone: zone })}
          />
          {err(`from${i}`)}
          <div className="field">
            <label htmlFor={`dep${i}`}>Departs (local time)</label>
            <input
              id={`dep${i}`}
              type="datetime-local"
              value={leg.departLocal}
              onChange={(e) => setLeg(i, { departLocal: e.target.value })}
              {...inv(`dep${i}`)}
            />
            {err(`dep${i}`)}
          </div>
          <AirportField
            id={`to${i}`}
            label="To"
            code={leg.to}
            zone={leg.toZone}
            onChange={(code, zone) => setLeg(i, { to: code, toZone: zone })}
          />
          {err(`to${i}`)}
          <div className="field">
            <label htmlFor={`arr${i}`}>Arrives (local time)</label>
            <input
              id={`arr${i}`}
              type="datetime-local"
              value={leg.arriveLocal}
              onChange={(e) => setLeg(i, { arriveLocal: e.target.value })}
              {...inv(`arr${i}`)}
            />
            {err(`arr${i}`)}
          </div>
          {i > 0 && (
            <button type="button" className="btn link" onClick={() => removeLeg(i)}>
              Remove this flight
            </button>
          )}
        </fieldset>
      ))}
      {input.legs.length < MAX_LEGS && (
        <button type="button" className="btn secondary" onClick={addLeg}>
          + Add connection
        </button>
      )}

      <fieldset className="card">
        <legend>Time zones</legend>
        <p className="hint">Filled in from your airports. Change only if your body clock lives somewhere else.</p>
        <div className="row">
          <div className="field">
            <label htmlFor="homeZone">Body clock now</label>
            <select
              id="homeZone"
              value={input.homeZone}
              onChange={(e) => {
                setHomeTouched(true)
                apply({ ...input, homeZone: e.target.value }, true)
              }}
            >
              {zoneOptions(input.homeZone).map((z) => (
                <option key={z}>{z}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="destZone">Destination time zone</label>
            <select
              id="destZone"
              value={input.destZone}
              onChange={(e) => {
                setDestTouched(true)
                apply({ ...input, destZone: e.target.value }, homeTouched, true)
              }}
            >
              {zoneOptions(input.destZone).map((z) => (
                <option key={z}>{z}</option>
              ))}
            </select>
          </div>
        </div>
        {input.legs.some((l) => l.from && !findAirport(l.from)) && (
          <p className="hint">Tip: pick an airport from the list to set its timezone automatically.</p>
        )}
      </fieldset>

      <fieldset className="card">
        <legend>Sleep habits (at home)</legend>
        <div className="row">
          <div className="field">
            <label htmlFor="bed">Usual bedtime</label>
            <input
              id="bed"
              type="time"
              value={input.habits.bedtime}
              onChange={(e) => setInput({ ...input, habits: { ...input.habits, bedtime: e.target.value } })}
              {...inv('bed')}
            />
            {err('bed')}
          </div>
          <div className="field">
            <label htmlFor="wake">Usual wake time</label>
            <input
              id="wake"
              type="time"
              value={input.habits.wakeTime}
              onChange={(e) => setInput({ ...input, habits: { ...input.habits, wakeTime: e.target.value } })}
              {...inv('wake')}
            />
            {err('wake')}
          </div>
        </div>
      </fieldset>

      <fieldset className="card">
        <legend>Options</legend>
        <div className="row">
          <div className="field">
            <label htmlFor="pre">Days to start adjusting before you fly (0–3)</label>
            <select
              id="pre"
              value={input.preShiftDays}
              onChange={(e) => setInput({ ...input, preShiftDays: Number(e.target.value) })}
            >
              {[0, 1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="post">Days after arrival (3–7)</label>
            <select
              id="post"
              value={input.postArrivalDays}
              onChange={(e) => setInput({ ...input, postArrivalDays: Number(e.target.value) })}
            >
              {[3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="strategy">Direction</label>
          <select
            id="strategy"
            value={input.strategy}
            onChange={(e) => setInput({ ...input, strategy: e.target.value as Strategy })}
          >
            <option value="auto">Auto (fastest)</option>
            <option value="advance">Pull my clock earlier</option>
            <option value="delay">Push my clock later</option>
          </select>
        </div>
        <Toggle
          label="I use caffeine"
          checked={input.usesCaffeine}
          onChange={(v) => setInput({ ...input, usesCaffeine: v })}
        />
        <Toggle
          label="Include melatonin"
          checked={input.useMelatonin}
          onChange={(v) => setInput({ ...input, useMelatonin: v })}
          note="Check with your doctor first, especially if pregnant, on medication or under 18."
        />
        <Toggle
          label="Include optional supplements"
          checked={input.includeSupplements}
          onChange={(v) => setInput({ ...input, includeSupplements: v })}
          note="Vitamin C, omega-3, B-complex, magnesium. Evidence is limited."
        />
      </fieldset>

      <div className="actions">
        <button type="submit" className="btn primary">
          Build my plan
        </button>
        <button type="button" className="btn secondary" onClick={loadExample}>
          Try an example
        </button>
      </div>
    </form>
  )
}

function Toggle({
  label,
  checked,
  onChange,
  note,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  note?: string
}) {
  return (
    <div className="toggle">
      <button
        type="button"
        className="switch"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
      >
        <span className="knob" aria-hidden="true" />
        <span className="switch-label">{label}</span>
        <span className="switch-state">{checked ? 'On' : 'Off'}</span>
      </button>
      {note && <p className="hint">{note}</p>}
    </div>
  )
}
