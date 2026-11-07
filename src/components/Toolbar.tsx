import { useState } from 'react'
import type { Plan } from '../engine/types'
import { encodeInput } from '../lib/share'
import { planToIcs } from '../lib/ics'

interface Props {
  plan: Plan
  onEdit: () => void
}

export default function Toolbar({ plan, onEdit }: Props) {
  const [msg, setMsg] = useState('')
  const flash = (m: string) => {
    setMsg(m)
    window.setTimeout(() => setMsg(''), 2500)
  }

  const share = async () => {
    location.hash = encodeInput(plan.input)
    const url = location.href
    try {
      await navigator.clipboard.writeText(url)
      flash('Link copied')
    } catch {
      window.prompt('Copy this link', url)
    }
  }

  const ics = () => {
    const blob = new Blob([planToIcs(plan)], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'jetlag-plan.ics'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    flash('Calendar file downloaded')
  }

  return (
    <div className="toolbar no-print" role="toolbar" aria-label="Plan actions">
      <button type="button" className="btn small" onClick={share}>
        Copy share link
      </button>
      <button type="button" className="btn small" onClick={ics}>
        Add to calendar (.ics)
      </button>
      <button type="button" className="btn small" onClick={() => window.print()}>
        Print
      </button>
      <button type="button" className="btn small" onClick={onEdit}>
        Edit trip
      </button>
      <span className="toast" role="status" aria-live="polite">
        {msg}
      </span>
    </div>
  )
}
