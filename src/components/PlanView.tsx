import { useMemo, useState } from 'react'
import { DateTime } from 'luxon'
import type { Plan } from '../engine/types'
import { useChecked } from '../hooks/useChecked'
import { useNow } from '../hooks/useNow'
import SummaryCard from './SummaryCard'
import DayNavigator from './DayNavigator'
import DayPanel from './DayPanel'
import Toolbar from './Toolbar'
import SupplementsTable from './SupplementsTable'
import FaqAccordion from './FaqAccordion'
import AboutSection from './AboutSection'
import { fmtDate, hashString } from './format'

interface Props {
  plan: Plan
  onEdit: () => void
}

export default function PlanView({ plan, onEdit }: Props) {
  const now = useNow()
  const planKey = useMemo(() => hashString(JSON.stringify(plan.input) + plan.version), [plan])
  const [done, toggle] = useChecked(planKey)

  const isTodayIdx = (i: number) => DateTime.fromMillis(now).setZone(plan.days[i].zone).toISODate() === plan.days[i].date
  const todayIndex = plan.days.findIndex((_, i) => isTodayIdx(i))
  const [selected, setSelected] = useState(() => (todayIndex >= 0 ? todayIndex : 0))
  const sel = Math.min(selected, plan.days.length - 1)

  const legs = plan.input.legs
  const route = [legs[0].from, ...legs.map((l) => l.to)].join(' → ')
  const first = plan.days[0]?.date
  const last = plan.days[plan.days.length - 1]?.date

  return (
    <div className="planview">
      <header className="plan-head">
        <h1 className="title">{route}</h1>
        {first && last && (
          <p className="dates">
            {fmtDate(first, 'LLL d')} – {fmtDate(last, 'LLL d, yyyy')}
          </p>
        )}
      </header>
      <SummaryCard plan={plan} />
      <Toolbar plan={plan} onEdit={onEdit} />
      <DayNavigator days={plan.days} selected={sel} todayIndex={todayIndex} onSelect={setSelected} />
      <div className="screen-only">
        {plan.days[sel] && (
          <DayPanel legs={legs} day={plan.days[sel]} isToday={sel === todayIndex} now={now} done={done} onToggle={toggle} />
        )}
      </div>
      <div className="print-only">
        {plan.days.map((d) => (
          <DayPanel legs={legs} key={d.date} day={d} isToday={false} now={now} done={done} onToggle={toggle} />
        ))}
      </div>
      <SupplementsTable />
      <FaqAccordion />
      <AboutSection />
    </div>
  )
}
