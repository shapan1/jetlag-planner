# Scheduling algorithm (spec)

Pure function `generatePlan(input: TripInput): Plan` in `src/engine/generatePlan.ts`. Use Luxon for all time math. Never use JS `Date` arithmetic directly.

## 0. Definitions
- `home` = input.homeZone, `dest` = input.destZone.
- `dep` = first leg departLocal in its fromZone → DateTime. `arr` = last leg arriveLocal in its toZone → DateTime.
- `bed`, `wake` = habits (home wall clock). `sleepLen = (wake - bed) mod 24` hours (typ. 7–9).
- **Tmin** (core body temperature minimum) = `wake − 3h` on the body clock (CDC Yellow Book: nadir ≈ 2–4 h before habitual wake).
- `rawShift` = `offset(dest, arr) − offset(home, dep)` in hours (signed, +10.5 for EST→IST). Compute from real offsets on the actual dates so US DST is handled; India has no DST.

## 1. Strategy choice (`strategy === 'auto'`)
Eastward shift `E = rawShift` (if rawShift < 0, treat it as westward and just use delay with `W = -rawShift`).
- Advance option: cover `E` hours at **1.0 h/day** → `daysAdv = E / 1.0`.
- Delay option ("go the long way round", antidromic): cover `24 − E` hours at **1.5 h/day** → `daysDel = (24 − E) / 1.5`.
- Pick the smaller. Tie → advance. (CDC: adaptation ≈ 1 h/day eastward, 1.5 h/day westward.)
- Worked: EST→IST +10.5 → adv 10.5 d vs del 9.0 d → **delay**. EDT→IST +9.5 → 9.5 vs 9.7 → **advance**. PST→IST +13.5 → 13.5 vs 7.0 → **delay**.
- User may force `advance`/`delay`. Fill `summary.rationale` with a 2–3 sentence plain-language explanation naming both day counts.

## 2. Daily body-clock model
Track `bodyBed_k` = where the body's bedtime sits on the *destination* wall clock on day k (k=0 is the first pre-shift day).
- Initial: `bodyBed_0 = bed (home wall clock) expressed in dest wall clock` = `bed + rawShift` (mod 24). E.g. bed 23:00 home, +10.5 → body bedtime is 09:30 dest time.
- Each day in the shift direction: advance → `bodyBed_{k+1} = bodyBed_k − rate`; delay → `+ rate`. Stop when it reaches the target bedtime `bed` (dest wall clock). Clamp; never overshoot.
- Pre-shift days (before departure) use the SAME rule but expressed in home wall clock (advance: go to bed 1 h earlier each day; delay: 1 h later each day). Cap pre-shift at `preShiftDays` (default 2, CDC: 2–3 days).
- `remainingShiftHours` for a day = signed difference between `bodyBed_k` and `bed`.

## 3. Items emitted per day (all in the zone the person is physically in)
Let `B = bodyBed_k` (today's target bedtime), `Wk = B + sleepLen` (target wake), `T = Wk − 3h` (today's Tmin).

| kind | advance | delay | evidence |
|---|---|---|---|
| sleep | B → Wk | B → Wk | strong |
| wake | Wk | Wk | strong |
| light_seek | T+0h → T+4h (post-nadir morning light) | T−4h → T (pre-nadir evening light) — clamp to ≤ midnight sensible, mark `key` | strong |
| light_avoid | T−4h → T (wear blue-blocking glasses if indoors lights/screens are unavoidable) | T → T+4h (sunglasses/glasses after wake if it is daylight) | strong |
| melatonin (if useMelatonin) | 0.5–1 mg at `B − 90min` (CDC fig. 7.4.2 eastward). Skip when `B − 90min` falls between body-clock 00:00–05:00 (CDC: ineffective when endogenous melatonin is high) | none during the shift (Timeshifter: not useful for delaying); optional 0.5 mg at bedtime only as sleep aid, evidence low | moderate |
| caffeine_ok (if usesCaffeine) | Wk → B − 6h | Wk → B − 6h | moderate |
| caffeine_stop | B − 6h | B − 6h | moderate |
| nap_ok | window Wk+2h → B − 8h, title "Short nap OK (≤30 min)" | same | moderate |
| meal | breakfast at Wk+0.5h (protein-forward), lunch Wk+5h, dinner B−3h (lighter, low-carb). Skip meals that fall inside the sleep window | same | low |
| exercise | within light_seek window, "Walk outside" | same | low |
| hydrate | every ~3 h while awake on travel day only | same | low |
| supplement (if includeSupplements) | morning: B-complex (B6/B12) with breakfast; with lunch: vitamin C 500 mg + omega-3 1 g; evening: magnesium 200–300 mg with dinner | same | low |

## 4. Travel day specifics
- Emit one `flight` item per leg (depart→arrive), zone = fromZone.
- During the flight, compute the body-clock night (`B → Wk`) in UTC and emit `sleep` only if ≥ 3 h of it overlaps the flight; otherwise emit `note` "Stay awake on this flight; nap ≤30 min only".
- `light_avoid` during the flight when inside the avoid window: "Glasses on / eyeshade; dim screen".
- Optional `fast` window: from boarding until the destination breakfast (`Wk + 0.5h` on arrival day) — title "Optional: skip plane meals; drink water", evidence **low**, detail notes the evidence is limited (Forbes-Robertson 2012).
- `hydrate` every 3 h in flight. `note`: "No alcohol; avoid caffeine on board except as scheduled."
- `reset` point event at the first destination `Wk` after landing (or at landing if landing is after Wk and before B−6h): "Morning anchor: get outside in daylight, have coffee + a protein breakfast". If landing happens inside light_avoid, make the first item after landing a `light_avoid` with `key: true` ("Wear sunglasses from the gate until HH:mm").

## 5. Days and labels
- Days run from `dep.startOf('day') − preShiftDays` (home zone) to `arr.startOf('day') + postArrivalDays` (dest zone).
- Phase: `pre` before departure date; `travel` for any date containing a flight; `arrival` for the arrival date if not a travel day start; `post` after.
- Labels: "2 days before departure", "Day before departure", "Travel day", "Arrival day", "Day 2 in India", … Use dest city name when known ("in Bengaluru"), else "at destination".
- Sort items by start. Mark 3–5 `key` items per day: sleep, light_seek, light_avoid, melatonin, reset.
- Item `id` = `${date}-${kind}-${index}`.

## 6. Summary
- `estimatedDaysToAdjust = ceil(shiftToCover / rate)`.
- warnings: preShiftDays === 0 → "No pre-shift: expect a tougher first 2 days"; sleepLen < 6 or > 10 → "Unusual sleep length; check your times"; arrival between body-clock 00:00–05:00 → "You land in the middle of your body's night; the plan keeps you up until HH:mm".
- version: "1.0.0".

## 7. Tests (vitest, `src/engine/*.test.ts`)
- JFK→BLR (EST, +10.5): strategy delay, days ≥ 9, every day has exactly one sleep item, no overlapping sleep windows.
- JFK→DEL in July (EDT, +9.5): strategy advance; melatonin present at B−90m on each shifting day.
- SFO→BOM Dec (PST, +13.5): delay; `rawShift` is 13.5 not −10.5.
- Forced strategy respected. usesCaffeine=false → zero caffeine items. useMelatonin=false → zero melatonin items.
- All item ISO strings parse with Luxon and carry an offset; items sorted; `remainingShiftHours` monotonically approaches 0.
- Determinism: same input → deep-equal output.
