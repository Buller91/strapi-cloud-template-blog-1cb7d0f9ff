import { useState } from 'react'
import Start from './pages/Start.jsx'
import { destinations, budgetTiers } from './data/destinations.js'
import { formatStay } from './lib/format.js'

const label = (list, key, id) => list.find((entry) => entry[key] === id)?.name ?? id

/**
 * Placeholder for the next screen. It exists so the first screen has a
 * visible outcome — the itinerary builder replaces it in the next phase.
 */
function Received({ brief, onEdit }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-24 sm:px-10">
      <p className="eyebrow text-gold">Noted</p>

      <h1 className="font-display text-[2.5rem] leading-tight font-light mt-8 sm:text-5xl">
        {label(destinations, 'slug', brief.destination)}
        <span className="block italic text-bone/70">{formatStay(brief.arrival, brief.departure)}</span>
      </h1>

      <p className="text-[0.9375rem] text-muted mt-6 leading-relaxed">
        {brief.guests} {brief.guests === 1 ? 'guest' : 'guests'} ·{' '}
        {label(budgetTiers, 'id', brief.budget)}. The itinerary comes next.
      </p>

      <button
        type="button"
        onClick={onEdit}
        className="eyebrow text-muted mt-12 self-start border-b border-line pb-2 transition-colors duration-300 hover:text-bone hover:border-gold/50"
      >
        Change something
      </button>
    </main>
  )
}

export default function App() {
  const [brief, setBrief] = useState(null)

  return brief
    ? <Received brief={brief} onEdit={() => setBrief(null)} />
    : <Start onSubmit={setBrief} />
}
