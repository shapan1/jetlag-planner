# Jet Lag Planner

A free, client-side jet-lag planner for US to India trips. Enter your flights and sleep habits and get a day-by-day plan (sleep, light, melatonin, caffeine, meals) that you can export to your calendar. It is inspired by Flykitt's approach and built on science published by the CDC Yellow Book and Timeshifter.

## Run locally

```
npm i
npm run dev
npm test
```

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which runs the tests, builds with `VITE_BASE=/<repo-name>/`, and publishes `dist` to GitHub Pages. Enable Pages with source "GitHub Actions" in the repo settings.

## Medical disclaimer

This tool provides general wellness information only, not medical advice. Talk to a clinician before using melatonin or supplements, especially if you are pregnant, take medication, or have a sleep or medical condition. Do not drive or operate machinery when drowsy.

Not affiliated with Flykitt.
