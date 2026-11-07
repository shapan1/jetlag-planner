import { useMemo, useState } from 'react'
import type { TripInput } from './engine/types'
import { generatePlan } from './engine'
import { decodeInput, loadLocal, saveLocal } from './lib/share'
import TripForm, { BLANK_INPUT } from './components/TripForm'
import PlanView from './components/PlanView'
import ThemeToggle from './components/ThemeToggle'
import Footer from './components/Footer'

function fromHash(): TripInput | null {
  const h = location.hash.slice(1)
  return h ? decodeInput(h) : null
}

export default function App() {
  const [shared] = useState(fromHash)
  const [saved] = useState(() => (shared ? null : loadLocal()))
  const [input, setInput] = useState<TripInput>(shared ?? saved ?? BLANK_INPUT)
  const [view, setView] = useState<'form' | 'plan'>(shared ? 'plan' : 'form')
  const [formKey, setFormKey] = useState(0)

  const plan = useMemo(() => (view === 'plan' ? generatePlan(input) : null), [input, view])

  const build = (next: TripInput) => {
    saveLocal(next)
    setInput(next)
    setView('plan')
    window.scrollTo(0, 0)
  }

  const edit = () => {
    setFormKey((k) => k + 1)
    setView('form')
    window.scrollTo(0, 0)
  }

  return (
    <div className="app">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="topbar no-print">
        <span className="brand">Jet Lag Planner</span>
        <ThemeToggle />
      </div>
      <main id="main" className="container">
        {view === 'plan' && plan ? (
          <PlanView plan={plan} onEdit={edit} />
        ) : (
          <TripForm key={formKey} initial={input} onBuild={build} />
        )}
      </main>
      <Footer />
    </div>
  )
}
