import type { Plan } from '../engine/types'
import { signed } from './format'

export default function SummaryCard({ plan }: { plan: Plan }) {
  const s = plan.summary
  const words =
    s.strategy === 'delay'
      ? 'Push your clock later (fewer days for this trip)'
      : 'Pull your clock earlier'
  return (
    <section className="card summary" aria-labelledby="sum-h">
      <h2 id="sum-h" className="visually-hidden">
        Summary
      </h2>
      <dl className="stats">
        <div>
          <dt>Time difference</dt>
          <dd>{signed(s.rawShiftHours)} h</dd>
        </div>
        <div>
          <dt>Strategy</dt>
          <dd>{words}</dd>
        </div>
        <div>
          <dt>Days to adjust</dt>
          <dd>about {s.estimatedDaysToAdjust}</dd>
        </div>
      </dl>
      <p className="rationale">{s.rationale}</p>
      {s.warnings.length > 0 && (
        <ul className="warnings" aria-label="Warnings">
          {s.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
