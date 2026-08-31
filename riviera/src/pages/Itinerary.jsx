import { useEffect, useState } from 'react'
import { requestItinerary, guestLanguage } from '../lib/itinerary.js'
import { formatStay, formatDay } from '../lib/format.js'
import { destinations, budgetTiers } from '../data/destinations.js'

const label = (list, key, id) => list.find((entry) => entry[key] === id)?.name ?? id

function Composing() {
  return (
    <div className="py-24" role="status">
      <p className="eyebrow text-gold animate-pulse">Composing</p>
      <p className="font-display text-[1.75rem] font-light mt-6 text-bone/70">
        We are putting your days in order.
      </p>
      <p className="text-[0.8125rem] text-muted mt-3">This takes a moment.</p>
    </div>
  )
}

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

function Entry({ item }) {
  return (
    <li className="grid grid-cols-[3.5rem_1fr] gap-x-5 gap-y-1 border-t border-line py-6 sm:grid-cols-[5rem_1fr]">
      <span className="eyebrow text-gold/80 pt-2 tabular-nums">{item.time}</span>

      <div>
        <p className="eyebrow text-muted">{item.kategorie}</p>
        <h3 className="font-display text-[1.5rem] font-light leading-tight mt-1">{item.name}</h3>
        <p className="text-[0.8125rem] text-muted mt-3 leading-relaxed">{item.why}</p>
        <p className="text-[0.75rem] text-muted/70 mt-2 italic">{item.price_estimate}</p>
      </div>
    </li>
  )
}

export default function Itinerary({ brief, onEdit }) {
  const [state, setState] = useState({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const locale = guestLanguage()

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })

    requestItinerary(brief, { signal: controller.signal })
      .then((result) => setState({ status: 'ready', ...result }))
      .catch((error) => {
        if (error.name === 'AbortError') return
        setState({ status: 'failed', message: error.message })
      })

    return () => controller.abort()
  }, [brief, attempt])

  return (
    <main className="mx-auto max-w-2xl px-6 pb-32 sm:px-10">
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

      {state.status === 'loading' && <Composing />}
      {state.status === 'failed' && <Failed message={state.message} onRetry={() => setAttempt((n) => n + 1)} />}

      {state.status === 'ready' && (
        <div className="mt-20 space-y-20 sm:mt-24">
          {state.days.map((day) => (
            <section key={day.date}>
              <div aria-hidden="true" className="flex items-baseline gap-4">
                <span className="eyebrow text-gold/70">{formatDay(day.date, locale)}</span>
                <span className="h-px flex-1 bg-line" />
              </div>

              <ul className="mt-6">
                {day.items.map((item, index) => (
                  <Entry key={`${day.date}-${index}`} item={item} />
                ))}
              </ul>
            </section>
          ))}

          <footer className="border-t border-line pt-8 space-y-3">
            <p className="text-[0.75rem] text-muted leading-relaxed">
              Every price is an estimate, not a quote. Nothing above is booked until the
              desk confirms it.
            </p>

            {state.unknown.length > 0 && (
              <p className="text-[0.75rem] text-gold/80 leading-relaxed">
                Not in our inventory, so unverified: {state.unknown.join(', ')}.
              </p>
            )}
          </footer>
        </div>
      )}
    </main>
  )
}
