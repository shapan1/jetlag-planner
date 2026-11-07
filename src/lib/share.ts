import type { TripInput } from '../engine/types'

const KEY = 'jetlag.input.v1'

export function encodeInput(i: TripInput): string {
  const bytes = new TextEncoder().encode(JSON.stringify(i))
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function isValid(v: unknown): v is TripInput {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  if (!Array.isArray(o.legs) || o.legs.length === 0) return false
  for (const l of o.legs) {
    if (!l || typeof l !== 'object') return false
    const leg = l as Record<string, unknown>
    for (const k of ['from', 'fromZone', 'to', 'toZone', 'departLocal', 'arriveLocal']) {
      if (typeof leg[k] !== 'string' || !leg[k]) return false
    }
  }
  if (typeof o.homeZone !== 'string' || !o.homeZone) return false
  if (typeof o.destZone !== 'string' || !o.destZone) return false
  const h = o.habits as Record<string, unknown> | undefined
  if (!h || typeof h.bedtime !== 'string' || typeof h.wakeTime !== 'string') return false
  return true
}

export function decodeInput(s: string): TripInput | null {
  try {
    let b = s.trim().replace(/-/g, '+').replace(/_/g, '/')
    while (b.length % 4) b += '='
    const bin = atob(b)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    const v: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return isValid(v) ? v : null
  } catch {
    return null
  }
}

export function saveLocal(i: TripInput): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(i))
  } catch {
    /* ignore */
  }
}

export function loadLocal(): TripInput | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const v: unknown = JSON.parse(raw)
    return isValid(v) ? v : null
  } catch {
    return null
  }
}
