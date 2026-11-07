import type { ItemKind } from '../engine/types'

export type Tone = 'sleep' | 'light' | 'dark' | 'pill' | 'food' | 'move' | 'flight' | 'info'

export const ITEM_KIND_META: Record<
  ItemKind,
  { label: string; emoji: string; tone: Tone; shortWhy: string }
> = {
  sleep: {
    label: 'Sleep',
    emoji: '😴',
    tone: 'sleep',
    shortWhy:
      'Sleeping at the new local night is what lets your body clock move, which shifts about 1 h/day east and 1.5 h/day west (CDC Yellow Book).',
  },
  wake: {
    label: 'Wake up',
    emoji: '⏰',
    tone: 'sleep',
    shortWhy:
      'A consistent wake time anchors the clock; light soon after waking pulls it earlier (CDC Yellow Book).',
  },
  nap_ok: {
    label: 'Nap OK',
    emoji: '💤',
    tone: 'sleep',
    shortWhy:
      'A short nap of 20-30 minutes takes the edge off tiredness without wrecking night sleep (CDC Yellow Book; Sleep Foundation).',
  },
  light_seek: {
    label: 'Seek bright light',
    emoji: '☀️',
    tone: 'light',
    shortWhy:
      'Light after your body-clock low point advances the clock, and light before it delays it, so timing matters (CDC Yellow Book; Timeshifter).',
  },
  light_avoid: {
    label: 'Avoid bright light',
    emoji: '🕶️',
    tone: 'dark',
    shortWhy:
      'Light at the wrong time pushes your clock the wrong way, so dim screens or wear amber glasses or sunglasses (Timeshifter).',
  },
  melatonin: {
    label: 'Melatonin',
    emoji: '💊',
    tone: 'pill',
    shortWhy:
      'Low doses of 0.5-1 mg are often enough, and higher is not better; for eastward trips take it about 90 minutes before bed (CDC Yellow Book).',
  },
  caffeine_ok: {
    label: 'Caffeine OK',
    emoji: '☕',
    tone: 'pill',
    shortWhy:
      'Caffeine in daylight helps you stay alert while you adjust (CDC Yellow Book).',
  },
  caffeine_stop: {
    label: 'Last caffeine',
    emoji: '🚫',
    tone: 'pill',
    shortWhy:
      'Stopping caffeine about 6 hours before bedtime protects the sleep your body clock needs (CDC Yellow Book).',
  },
  meal: {
    label: 'Meal',
    emoji: '🍽️',
    tone: 'food',
    shortWhy:
      'Eating on local schedule is a gentle time cue, though human evidence for meal timing is limited (Forbes-Robertson 2012).',
  },
  fast: {
    label: 'Skip food (optional)',
    emoji: '⏳',
    tone: 'food',
    shortWhy:
      'Skipping plane meals that fall at the wrong time may help a little, but the evidence is low, so treat it as optional (Forbes-Robertson 2012).',
  },
  hydrate: {
    label: 'Drink water',
    emoji: '💧',
    tone: 'food',
    shortWhy:
      'Cabin air is dry, and staying hydrated while avoiding excess alcohol and caffeine on board is standard advice (Sleep Foundation).',
  },
  supplement: {
    label: 'Supplement (optional)',
    emoji: '🧴',
    tone: 'pill',
    shortWhy:
      'Optional extras such as magnesium, B-complex, vitamin C or omega-3 have low evidence for jet lag, so skip them if you like.',
  },
  exercise: {
    label: 'Move',
    emoji: '🚶',
    tone: 'move',
    shortWhy:
      'A walk outside combines movement with daylight, but exercise as a time cue has limited human evidence (Forbes-Robertson 2012).',
  },
  flight: {
    label: 'Flight',
    emoji: '✈️',
    tone: 'flight',
    shortWhy:
      'Your flight window, shown so the rest of the plan can be read against it.',
  },
  reset: {
    label: 'Morning anchor',
    emoji: '🌅',
    tone: 'light',
    shortWhy:
      'On your first destination morning, wake at local time and get daylight, coffee and a protein breakfast to anchor your clock (CDC Yellow Book; Timeshifter).',
  },
  note: {
    label: 'Note',
    emoji: '📝',
    tone: 'info',
    shortWhy: 'Information only; nothing to do.',
  },
}

export const SUPPLEMENTS: {
  name: string
  flykittName: string
  dose: string
  when: string
  evidence: 'strong' | 'moderate' | 'low'
  note: string
}[] = [
  {
    name: 'Melatonin',
    flykittName: 'Mellow',
    dose: '0.5-1 mg (avoid more than 5 mg)',
    when: 'About 90 minutes before target bedtime at the destination (eastward).',
    evidence: 'moderate',
    note:
      'Check with a doctor first. It is not for children or during pregnancy without medical advice. Higher doses are not better, and it does little while your own melatonin is high (roughly 00:00-05:00 body-clock time).',
  },
  {
    name: 'Magnesium',
    flykittName: 'Mellow',
    dose: '200-300 mg',
    when: 'With dinner.',
    evidence: 'low',
    note:
      'Often marketed for sleep, but jet-lag-specific evidence is weak. Optional; ask a clinician if you have kidney problems or take other medicines.',
  },
  {
    name: 'B-complex',
    flykittName: 'Advance',
    dose: 'Standard B-complex (B6, B12)',
    when: 'With breakfast.',
    evidence: 'low',
    note: 'Sold for energy; there is little evidence it shifts the body clock. Optional.',
  },
  {
    name: 'Vitamin C',
    flykittName: 'Protect',
    dose: '500 mg',
    when: 'During travel day.',
    evidence: 'low',
    note:
      "Flykitt's idea that cabin pressure causes inflammation which worsens jet lag is a hypothesis with no citation given. Optional.",
  },
  {
    name: 'Omega-3',
    flykittName: 'Sustain',
    dose: '1 g',
    when: 'With lunch.',
    evidence: 'low',
    note: 'Sold for focus and inflammation; evidence for jet lag is low. Optional.',
  },
  {
    name: 'Caffeine + daylight ("morning anchor")',
    flykittName: 'Circadian Reset',
    dose: 'Up to 200 mg caffeine, as needed',
    when:
      'On waking at the destination: go outside into daylight, have coffee and a protein breakfast. Stop caffeine 6 hours before bedtime.',
    evidence: 'strong',
    note:
      'The light part is the best-supported lever; caffeine for alertness is moderately supported (CDC Yellow Book). Free and needs no purchase.',
  },
]

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Is this Flykitt?',
    a: 'No. This is an unaffiliated, free tool built from public science (CDC Yellow Book, Timeshifter and Sleep Foundation pages). Flykitt sells a kit with supplement packs and blue-light glasses plus a paid app. If you want that, buy it from them.',
  },
  {
    q: 'Why does it say "shift later" when India is east of the US?',
    a: 'Going east usually means shifting earlier, but a very large eastward shift can be cheaper to cover by delaying instead (antidromic re-entrainment). The planner works out both options, counting the days each needs, and picks the one with fewer days. No source gives a fixed threshold, so it compares them directly.',
  },
  {
    q: 'What are blue-light glasses for, and do I need to buy them?',
    a: 'They reduce light at times when light would push your clock the wrong way. Any amber or orange blue-blocking glasses work, and so do ordinary sunglasses plus dimmed screens. You do not need a branded pair.',
  },
  {
    q: 'What if my flight changes?',
    a: 'Edit the trip with the new times and rebuild the plan. Everything is recalculated from the flight details you enter.',
  },
  {
    q: 'What about children?',
    a: 'Ask a paediatrician. This planner gives no melatonin advice for children.',
  },
  {
    q: 'Should I skip alcohol and plane meals?',
    a: 'Avoiding alcohol and excess caffeine on board is standard advice (Sleep Foundation). Skipping or timing plane meals has low evidence as a clock cue, so it is optional.',
  },
  {
    q: 'How long until I feel normal?',
    a: 'Unaided, roughly 1 to 1.5 days per time zone crossed. Timed light (and, if appropriate, low-dose melatonin) can make the shift several times faster.',
  },
  {
    q: 'Does it work for India to the US too?',
    a: 'Yes. The engine handles westward travel as well, where the clock adapts a little faster (about 1.5 h/day). This version is tuned for US to India.',
  },
  {
    q: 'Can I get notifications?',
    a: 'Export the plan to your calendar as an .ics file and your phone will give you the alerts.',
  },
]

export const DISCLAIMER =
  'This planner provides general information and is not medical advice. Talk to a clinician before using melatonin or any supplement, especially if you are pregnant, on medication or planning this for a child. It is not affiliated with Flykitt, Inc.'

export const ABOUT: { title: string; paragraphs: string[] } = {
  title: 'About this planner',
  paragraphs: [
    'You enter your flights and usual sleep times, and the planner builds a day-by-day checklist from the morning you leave until a couple of days after landing: when to sleep, seek or avoid light, take optional melatonin and stop caffeine.',
    'The rules come from public sources: the CDC Yellow Book 2026 (chapter 7.4, Jet Lag Disorder), the Timeshifter science pages on light and melatonin, and the Sleep Foundation jet lag guide. Each item is labelled with how strong the evidence is.',
    "It was built by looking at what Flykitt's app visibly does and at the published science. Nothing was copied from their software, and this project is not affiliated with Flykitt.",
  ],
}
