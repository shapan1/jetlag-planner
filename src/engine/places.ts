const CITY_BY_CODE: Record<string, string> = {
  JFK: 'New York', EWR: 'New York', LGA: 'New York', BOS: 'Boston', IAD: 'Washington', ORD: 'Chicago',
  ATL: 'Atlanta', DFW: 'Dallas', IAH: 'Houston', DEN: 'Denver', SFO: 'San Francisco', LAX: 'Los Angeles',
  SEA: 'Seattle', SJC: 'San Jose', YYZ: 'Toronto', BLR: 'Bengaluru', DEL: 'Delhi', BOM: 'Mumbai',
  MAA: 'Chennai', HYD: 'Hyderabad', CCU: 'Kolkata', COK: 'Kochi', AMD: 'Ahmedabad', LHR: 'London',
  CDG: 'Paris', FRA: 'Frankfurt', AMS: 'Amsterdam', DXB: 'Dubai', DOH: 'Doha', AUH: 'Abu Dhabi',
  SIN: 'Singapore', HKG: 'Hong Kong', NRT: 'Tokyo', HND: 'Tokyo', SYD: 'Sydney', MEL: 'Melbourne', AKL: 'Auckland',
}

const PLACE_BY_ZONE: Record<string, string> = {
  'America/New_York': 'New York',
  'America/Chicago': 'Chicago',
  'America/Denver': 'Denver',
  'America/Los_Angeles': 'California',
  'Asia/Kolkata': 'India',
  'Europe/London': 'the UK',
  'Europe/Paris': 'Paris',
  'Asia/Dubai': 'Dubai',
  'Asia/Singapore': 'Singapore',
  'Asia/Tokyo': 'Japan',
  'Australia/Sydney': 'Sydney',
}

export function cityForCode(code: string): string | undefined {
  return CITY_BY_CODE[code.trim().toUpperCase()]
}

/** Friendly place for a zone, e.g. "India", "New York". */
export function placeForZone(zone: string): string {
  return PLACE_BY_ZONE[zone] ?? (zone.split('/').pop() ?? zone).replace(/_/g, ' ')
}
