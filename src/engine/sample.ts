import type { TripInput } from './types'

/** JFK -> BLR sample used by the UI for its default/demo plan. */
export const SAMPLE_INPUT: TripInput = {
  legs: [
    {
      from: 'JFK',
      fromZone: 'America/New_York',
      to: 'BLR',
      toZone: 'Asia/Kolkata',
      departLocal: '2026-12-20T21:30',
      arriveLocal: '2026-12-22T00:45',
    },
  ],
  homeZone: 'America/New_York',
  destZone: 'Asia/Kolkata',
  habits: { bedtime: '23:00', wakeTime: '07:00' },
  preShiftDays: 2,
  postArrivalDays: 5,
  strategy: 'auto',
  usesCaffeine: true,
  useMelatonin: true,
  includeSupplements: true,
}
