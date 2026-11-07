import type { PlanItem } from '../engine/types'
import { ITEM_KIND_META } from '../content/protocol'
import { itemRange, zoneAbbr } from './format'

interface Props {
  item: PlanItem
  dayZone: string
  flightEndZone?: string
  done: boolean
  onToggle: (id: string) => void
}

const EVIDENCE_LABEL = { strong: 'Strong evidence', moderate: 'Moderate evidence', low: 'Limited evidence' } as const

export default function TimelineItem({ item, dayZone, flightEndZone, done, onToggle }: Props) {
  const meta = ITEM_KIND_META[item.kind]
  const cbId = `cb-${item.id}`
  const detail = item.detail ?? meta.shortWhy
  return (
    <li
      className={`tl-item tone-${meta.tone} kind-${item.kind}${item.key ? ' key' : ''}${done ? ' done' : ''}`}
      data-start={item.start}
    >
      <div className="tl-time">
        <span>{itemRange(item, flightEndZone)}</span>
        {item.zone !== dayZone && item.kind !== 'flight' && <small>{zoneAbbr(item.start, item.zone)}</small>}
      </div>
      <div className="tl-body">
        <div className="tl-head">
          <span className="tl-emoji" aria-hidden="true">
            {meta.emoji}
          </span>
          <label htmlFor={cbId} className="tl-title">
            {item.title}
          </label>
          <span className={`pill ev-${item.evidence}`}>{EVIDENCE_LABEL[item.evidence]}</span>
        </div>
        {item.key ? (
          <p className="tl-detail">{detail}</p>
        ) : (
          <details className="tl-more">
            <summary>Why?</summary>
            <p className="tl-detail">{detail}</p>
          </details>
        )}
      </div>
      <input
        id={cbId}
        type="checkbox"
        className="tl-check"
        checked={done}
        onChange={() => onToggle(item.id)}
        aria-label={`Done: ${item.title}`}
      />
    </li>
  )
}
