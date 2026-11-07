import { AIRPORTS, findAirport } from '../data/airports'
import { COMMON_ZONES } from './format'

interface Props {
  id: string
  label: string
  code: string
  zone: string
  onChange: (code: string, zone: string) => void
}

export function airportLabel(code: string): string {
  const a = findAirport(code)
  return a ? `${a.code} · ${a.city}` : code
}

export default function AirportField({ id, label, code, zone, onChange }: Props) {
  const known = findAirport(code)
  const zones = COMMON_ZONES.includes(zone) ? COMMON_ZONES : [zone, ...COMMON_ZONES]

  const handle = (raw: string) => {
    const maybe = raw.includes('·') ? raw.split('·')[0].trim() : raw.trim()
    const a = findAirport(maybe.toUpperCase())
    if (a) onChange(a.code, a.zone)
    else onChange(raw, zone)
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        list={`${id}-list`}
        value={airportLabel(code)}
        onChange={(e) => handle(e.target.value)}
        placeholder="Airport code or city, e.g. JFK"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
      />
      <datalist id={`${id}-list`}>
        {AIRPORTS.map((a) => (
          <option key={a.code} value={`${a.code} · ${a.city}`}>
            {a.name}
          </option>
        ))}
      </datalist>
      {!known && code.trim() !== '' && (
        <div className="subfield">
          <label htmlFor={`${id}-zone`}>Other timezone for “{code}”</label>
          <select id={`${id}-zone`} value={zone} onChange={(e) => onChange(code, e.target.value)}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
