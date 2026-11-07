import { describe, it, expect, beforeEach } from 'vitest'
import type { TripInput } from '../engine/types'
import { encodeInput, decodeInput, saveLocal, loadLocal } from './share'

const sample: TripInput = {
  legs: [
    {
      from: 'JFK',
      fromZone: 'America/New_York',
      to: 'DEL',
      toZone: 'Asia/Kolkata',
      departLocal: '2026-12-20T21:00',
      arriveLocal: '2026-12-21T22:30',
    },
  ],
  homeZone: 'America/New_York',
  destZone: 'Asia/Kolkata',
  habits: { bedtime: '23:00', wakeTime: '07:00' },
  preShiftDays: 2,
  postArrivalDays: 5,
  strategy: 'auto',
  usesCaffeine: true,
  useMelatonin: false,
  includeSupplements: true,
}

describe('share', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips through encode/decode, including unicode', () => {
    const i = { ...sample, legs: [{ ...sample.legs[0], from: 'Zürich ✈' }] }
    const s = encodeInput(i)
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decodeInput(s)).toEqual(i)
  })
  it('returns null for garbage or invalid shape', () => {
    expect(decodeInput('!!!not base64')).toBeNull()
    expect(decodeInput('')).toBeNull()
    expect(decodeInput(encodeInput({ ...sample, legs: [] }))).toBeNull()
  })
  it('saves and loads locally', () => {
    expect(loadLocal()).toBeNull()
    saveLocal(sample)
    expect(loadLocal()).toEqual(sample)
  })
  it('does not throw when localStorage throws', () => {
    const orig = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('quota')
    }
    expect(() => saveLocal(sample)).not.toThrow()
    Storage.prototype.setItem = orig
  })
})
