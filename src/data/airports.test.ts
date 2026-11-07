import { describe, it, expect } from 'vitest'
import { IANAZone } from 'luxon'
import { AIRPORTS, COMMON_ZONES, findAirport } from './airports'

describe('airports data', () => {
  it('all airport zones are valid IANA zones', () => {
    for (const a of AIRPORTS) expect(IANAZone.isValidZone(a.zone), `${a.code} ${a.zone}`).toBe(true)
  })
  it('all common zones are valid and unique', () => {
    for (const z of COMMON_ZONES) expect(IANAZone.isValidZone(z.zone), z.zone).toBe(true)
    expect(new Set(COMMON_ZONES.map((z) => z.zone)).size).toBe(COMMON_ZONES.length)
  })
  it('codes are unique and uppercase', () => {
    const codes = AIRPORTS.map((a) => a.code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const c of codes) expect(c).toMatch(/^[A-Z]{3}$/)
  })
  it('findAirport is case-insensitive', () => {
    expect(findAirport('jfk')?.zone).toBe('America/New_York')
    expect(findAirport('PHX')?.zone).toBe('America/Phoenix')
    expect(findAirport('HNL')?.zone).toBe('Pacific/Honolulu')
    expect(findAirport('del')?.country).toBe('IN')
    expect(findAirport('ZZZ')).toBeUndefined()
  })
})
