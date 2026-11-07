# Reconstruction evidence log (REA style)

Target: Flykitt (Flykitt, Inc. / Kitt Bio Inc.), a jet-lag product. Log compiled 2026-11-07 from docs/RESEARCH.md.

## Target routing
The target is a native iOS/Android app plus a marketing site. REA's binary and APK routes were not used. Evidence is public web content only (homepage, blog, App Store listing, third-party reviews, public science pages). Marketing claims are labelled as such.

## 1. Observed evidence
Each line is a statement found in a public source.

- O1. Product is a physical kit (supplement packs, "Unwind" blue-light glasses, travel case) plus an iOS/Android app that builds a timeline from flights and sleep habits and sends reminders. Source: https://www.flykitt.com/ and https://www.flykitt.com/blog/flykitts-jet-lag-solution-whats-included-and-how-it-works
- O2. Four packs named Advance, Protect, Sustain, Mellow, plus a Circadian Reset drink. Stated ingredients: Advance = B6/B12; Protect = pomegranate extract, vitamin C; Sustain = fish oil; Mellow = low-dose melatonin and magnesium; Reset = sugar and methylated B vitamins mixed with coffee (the Reset ingredients are per the Afar review). Source: Flykitt blog above; https://www.afar.com/magazine/can-flykitt-really-prevent-jet-lag-our-honest-review
- O3. Inputs: flights, usual sleep/wake, age, diet, activity, caffeine/alcohol use, focus areas. Source: reviews (Afar, thetraveloracle.net, Yahoo Creators) and the App Store listing https://apps.apple.com/us/app/flykitt/id1571767892
- O4. Plan starts the morning of departure ("I'm not going to ask you to do anything before the morning you leave", Herr) and runs about 48 h after landing. Source: reviews.
- O5. Items include: take pack X, glasses on, high-protein low-carb eating, avoid caffeine/alcohol on board, hydrate, a sleep window on the plane, Circadian Reset about 1 h before landing, bedtime on arrival night. Source: reviews.
- O6. Homepage sample plan: 6pm Take 2x Protect + 1x Sustain; 9pm take off; 10pm glasses on + 1x Mellow; 11pm sleep; 5am wake + Circadian Reset. Source: https://www.flykitt.com/
- O7. App features: push notifications, check-off tasks, an insights page showing sync with the new zone, automatic re-plan on flight changes. Source: reviews and App Store listing.
- O8. Pricing seen in reviews: about $99-$138 per round trip, refills $69; Pro $12.99/mo or $119.99/yr; Pro Light $4.99/mo or $49.99/yr.
- O9. Marketing claims (unverified): "93% of users report minimal to no jet lag"; research "with Navy SEALs and fighter pilots". Source: https://www.flykitt.com/
- O10. Flykitt claims cabin pressure/hypoxia causes inflammation that worsens jet lag; no citation given on their pages.
- O11. Public science: CDC Yellow Book 2026 ch. 7.4 (adaptation about 1 h/day east, 1.5 h/day west; light timing relative to the body-clock low point; melatonin 0.5-1 mg, avoid over 5 mg; caffeine cut-off 6 h before bed; naps 20-30 min). https://www.cdc.gov/yellow-book/hcp/travel-air-sea/jet-lag-disorder.html
- O12. Timeshifter: shifting is about 1 h/day naturally, 3-4x faster with timed light and melatonin; melatonin higher dose is not better. https://www.timeshifter.com/jet-lag/the-science-of-jet-lag
- O13. Sleep Foundation: about 1-1.5 days of symptoms per zone; about 75% find eastward worse. https://www.sleepfoundation.org/travel-and-sleep/jet-lag
- O14. Meal timing and exercise as human time cues have limited evidence (Forbes-Robertson 2012; https://en.wikipedia.org/wiki/Jet_lag).

## 2. Inferred features
What we conclude the app does, tied to evidence.

- I1. Rule-based scheduler that turns flight times plus habitual sleep into a timed checklist (O3, O4, O5, O6).
- I2. Plan window is departure morning to about 48 h post-arrival (O4).
- I3. Each item is a timed reminder with check-off (O5, O7).
- I4. Light management is a core mechanism, delivered through glasses on/off timing (O1, O5, O6).
- I5. Supplements are scheduled around bedtime and flight, with melatonin-type pack about an hour before sleep (O2, O6).
- I6. A destination "morning reset" item is built around waking, caffeine and food (O2, O5, O6).
- I7. Plan is recomputed when flights change (O7).
- I8. The underlying timing logic likely resembles published circadian rules, but this is an assumption (O11-O12 only show that such rules exist; nothing observed shows Flykitt uses them).

## 3. Reconstruction decisions
- D1. Windows are computed from CDC Yellow Book and Timeshifter rules (O11, O12), not from any Flykitt model.
- D2. Same plan shape: departure morning through about 48 h after landing, check-off items, calendar (.ics) export for phone alerts in place of push notifications (I1-I3).
- D3. Generic supplements replace their packs, each labelled with honest evidence level (see SUPPLEMENTS in src/content/protocol.ts). Their inflammation hypothesis (O10) is flagged as unproven.
- D4. Blue-light glasses are replaced by "amber glasses or sunglasses plus dim screens".
- D5. Both shift directions are computed for large eastward shifts and the shorter is chosen (see docs/ALGORITHM.md).
- D6. No pricing, branding, copy, or imagery taken from Flykitt; the app states it is unaffiliated.
- D7. Plan rebuild on trip edit replaces automatic re-plan (I7).

## 4. Unknowns / not examined
- Flykitt's exact timing model and how it uses age, diet and activity inputs.
- Pack doses (only ingredient names were published).
- The product page was rate-limited when fetched, so its details were not captured.
- The iOS/Android app binaries were not decompiled or inspected.
- Network traffic from the app was not captured.
- Whether the "93%" claim or the inflammation mechanism holds up; no independent data seen.
