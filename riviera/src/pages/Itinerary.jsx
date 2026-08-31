import { useEffect, useMemo, useState } from 'react'
import { requestItinerary, guestLanguage } from '../lib/itinerary.js'
import { sumEstimates } from '../lib/price.js'
import { formatStay } from '../lib/format.js'
import { destinations, budgetTiers } from '../data/destinations.js'
import DayCard from '../components/DayCard.jsx'
import SelectionBar from '../components/SelectionBar.jsx'
import Spinner from '../components/Spinner.jsx'

const label = (list, key, id) => list.find((entry) => entry[key] === id)?.name ?? id
const keyOf = (date, index) => `${date}#${index}`

function Failed({ message, onRetry }) {
  return (
    <div className="py-24" role="alert">
      <p className="eyebrow text-gold">Not this time</p>
      <p className="font-display text-[1.75rem] font-light mt-6 leading-snug">{message}</p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-10 border border-gold/50 px-10 py-5 eyebrow text-bone transition-colors duration-300
                   hover:bg-gold hover:text-ink focus-visible:outline focus-visible:outline-1
                   focus-visible:outline-offset-4 focus-visible:outline-gold"
      >
        Try again
      </button>
    </div>
  )
}

export default function Itinerary({ brief, onEdit, onRequest }) {
  const [state, setState] = useState({ status: 'loading' })
  const [selected, setSelected] = useState(() => new Set())
  const [attempt, setAttempt] = useState(0)
  const locale = guestLanguage()

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })

    requestItinerary(brief, { signal: controller.signal })
      .then((result) => {
        setState({ status: 'ready', ...result })
        // The desk proposed the programme; the guest curates it down.
        setSelected(new Set(result.days.flatMap((day) => day.items.map((_, i) => keyOf(day.date, i)))))
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setState({ status: 'failed', message: error.message })
      })

    return () => controller.abort()
  }, [brief, attempt])

  const toggle = (date, index) =>
    setSelected((prev) => {
      const next = new Set(prev)
      const key = keyOf(date, index)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const chosen = useMemo(() => {
    if (state.status !== 'ready') return []
    return state.days.flatMap((day) => day.items.filter((_, i) => selected.has(keyOf(day.date, i))))
  }, [state, selected])

  const total = useMemo(() => sumEstimates(chosen, brief.guests), [chosen, brief.guests])

  return (
    <main className={`mx-auto max-w-2xl px-6 sm:px-10 ${state.status === 'ready' ? 'pb-52' : 'pb-32'}`}>
      <header className="pt-14 sm:pt-24">
        <p className="eyebrow text-gold">Your programme</p>

        <h1 className="font-display text-[2.5rem] leading-[1.1] font-light mt-8 sm:text-5xl">
          {label(destinations, 'slug', brief.destination)}
          <span className="block italic text-bone/70">
            {formatStay(brief.arrival, brief.departure, locale)}
          </span>
        </h1>

        <p className="text-[0.8125rem] text-muted mt-6">
          {brief.guests} {brief.guests === 1 ? 'guest' : 'guests'} · {label(budgetTiers, 'id', brief.budget)}
        </p>

        <button
          type="button"
          onClick={onEdit}
          className="eyebrow text-muted mt-8 border-b border-line pb-2 transition-colors duration-300
                     hover:text-bone hover:border-gold/50"
        >
          Change the brief
        </button>
      </header>

      {state.status === 'loading' && (
        <div className="flex flex-col items-center py-32 text-center">
          <Spinner label="Composing your programme" />
          <p className="text-[0.8125rem] text-muted mt-8">Composing your days.</p>
        </div>
      )}

      {state.status === 'failed' && <Failed message={state.message} onRetry={() => setAttempt((n) => n + 1)} />}

      {state.status === 'ready' && (
        <>
          <div className="mt-16 space-y-6 sm:mt-20">
            {state.days.map((day, index) => (
              <DayCard
                key={day.date}
                date={day.date}
                items={day.items}
                index={index}
                locale={locale}
                isSelected={(date, i) => selected.has(keyOf(date, i))}
                onToggle={toggle}
              />
            ))}
          </div>

          <footer className="mt-12 space-y-3">
            <p className="text-[0.75rem] text-muted leading-relaxed">
              The total is indicative for {brief.guests}{' '}
              {brief.guests === 1 ? 'guest' : 'guests'}, with each entry counted once at
              its own unit. Every price is an estimate, not a quote, and nothing above is
              booked until the desk confirms it.
            </p>

            {state.unknown.length > 0 && (
              <p className="text-[0.75rem] text-gold/80 leading-relaxed">
                Not in our inventory, so unverified: {state.unknown.join(', ')}.
              </p>
            )}
          </footer>

          <SelectionBar
            total={total}
            count={chosen.length}
            locale={locale}
            onRequest={() => onRequest(chosen, total)}
          />
        </>
      )}
    </main>
  )
}
