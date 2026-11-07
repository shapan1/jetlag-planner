# Research notes: Flykitt and the science behind the planner

Compiled 2026-11-07. Marketing claims are labelled as such. Nothing here was taken from decompiling Flykitt's app.

## What Flykitt is (company)
- Flykitt, Inc. (app published by Kitt Bio Inc.; © Fount). Founder Andrew Herr, who ran human-performance programmes for the US military ("research with Navy SEALs and fighter pilots" — marketing). CTO Clayton Kim.
- Product: a physical kit (custom supplement packs + blue-light-blocking "Unwind" glasses + travel case) and an iOS/Android app that builds a personalised timeline from your flights and sleep habits and pushes reminders.
- Price seen in reviews: ~$99–$138 per round trip, refills $69; app subscription tiers Flykitt Pro $12.99/mo or $119.99/yr, Pro Light $4.99/mo or $49.99/yr.
- Claim (marketing, unverified): "93% of users report minimal to no jet lag".

## The kit's four supplements (names from Flykitt's blog) and the generic equivalents this clone suggests
| Flykitt pack | Stated purpose | Stated ingredients | Generic equivalent in the planner | Evidence |
|---|---|---|---|---|
| Advance | energy / circadian shift | activated B vitamins (B6, B12) | B-complex with breakfast | low |
| Protect | flight inflammation | pomegranate extract, vitamin C | vitamin C 500 mg (+ optional omega-3 1 g) | low |
| Sustain | focus / inflammation | fish oil / omega-3 | omega-3 1 g with lunch | low |
| Mellow | sleep / circadian shift | low-dose melatonin, magnesium | melatonin 0.5–1 mg 90 min before target bedtime; magnesium 200–300 mg at dinner | melatonin: moderate; magnesium: low |
| Circadian Reset drink | "metabolic reset" on waking at destination | sugar + methylated B vitamins (per Afar review), mixed with coffee | "Morning anchor": daylight + coffee + protein breakfast | light+caffeine: strong/moderate |

Flykitt's distinctive claim is that cabin pressure/hypoxia causes inflammation that worsens jet lag, and that its anti-inflammatory supplements address this. No citation is given on their pages; treat as a hypothesis.

## What the Flykitt app does (from reviews and the homepage sample plan)
- Inputs: flights (route and times), usual sleep/wake, age, diet, activity, caffeine/alcohol use, focus areas.
- Output: a checklist timeline starting the morning of departure (Herr: "I'm not going to ask you to do anything before the morning you leave"), running through ~48 h after landing. Items: take pack X, put on glasses, eat (high-protein, low-carb), avoid caffeine/alcohol on board, hydrate, sleep window on the plane, "Circadian Reset" ~1 h before landing, bedtime on arrival night.
- Homepage sample: 6pm Take 2x Protect + 1x Sustain · 9pm take off · 10pm glasses on + 1x Mellow · 11pm sleep · 5am wake + Circadian Reset.
- Features: push notifications, check-off tasks, "insights" page showing sync with new zone, automatic re-plan on flight changes.

## Science the planner is built on (sourced)
- CDC Yellow Book 2026, ch. 7.4 Jet Lag Disorder: adaptation ≈ 1 h/day eastward, 1.5 h/day westward; circadian nadir ≈ 2–4 h before habitual wake; morning light after the nadir advances, evening light delays; melatonin 0.5–1 mg is often enough, avoid >5 mg, ineffective when endogenous melatonin is high (body clock ~00:00–05:00); eastward: take melatonin ~90 min before bed; caffeine 200 mg every 4 h as needed in daylight, stop 6 h before bedtime; naps 20–30 min only; pre-shift sleep 1 h/day for 2–3 days before; for trips <2 days don't adapt.
- Timeshifter science pages: clock shifts ~1 h/day naturally, 3–4× faster with timed light + melatonin; light before the "crossover" (~6 am for a 00:00–08:00 sleeper) delays, after it advances; melatonin 0.5–3 mg, higher is not better; melatonin before ~1 am advances, after ~1 am delays; not useful for westward pre-adaptation.
- Sleep Foundation: symptoms last ~1–1.5 days per zone; ~75% find eastward worse; naps <30 min and ≥8 h before bedtime; shift schedule 1–2 h in the two days before; avoid alcohol/excess caffeine on board.
- Wikipedia / Forbes-Robertson 2012 (Sports Med): meal timing and exercise as time cues have limited human evidence.
- "Antidromic" re-entrainment: for very large eastward shifts the body may adjust by delaying instead. No source gave a numeric threshold, so the planner computes both options and picks the one with fewer days (see ALGORITHM.md).

## Sources
- https://www.flykitt.com/ · https://www.flykitt.com/blog/flykitts-jet-lag-solution-whats-included-and-how-it-works
- https://apps.apple.com/us/app/flykitt/id1571767892
- https://www.afar.com/magazine/can-flykitt-really-prevent-jet-lag-our-honest-review · https://thetraveloracle.net/flykitt-the-magic-bullet-for-jet-lag/ · https://creators.yahoo.com/lifestyle/story/flykitt-review-the-antijet-lag-system-that-actually-worked-for-me-013929560.html
- https://www.cdc.gov/yellow-book/hcp/travel-air-sea/jet-lag-disorder.html
- https://www.timeshifter.com/jet-lag/the-science-of-jet-lag · https://www.timeshifter.com/jet-lag/melatonin-for-jet-lag-type-dose-timing
- https://www.sleepfoundation.org/travel-and-sleep/jet-lag · https://en.wikipedia.org/wiki/Jet_lag
