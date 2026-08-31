import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadRequests, combineTotals } from '../lib/requests.js'
import { formatRange } from '../lib/price.js'
import { formatStay } from '../lib/format.js'
import { destinations, budgetTiers } from '../data/destinations.js'

const label = (list, key, id) => list.find((entry) => entry[key] === id)?.name ?? id

function Row({ term, children }) {
  return (
    <div>
      <dt className="eyebrow text-muted">{term}</dt>
      <dd className="font-display text-[1.125rem] font-light mt-1.5">{children}</dd>
    </div>
  )
}

function RequestCard({ record, locale }) {
  const [open, setOpen] = useState(false)

  return (
    <article className="border border-line">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-4">
        <p className="eyebrow text-gold tabular-nums">{record.reference}</p>
        <p className="text-[0.75rem] text-muted tabular-nums">
          {new Date(record.createdAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-5 px-5 py-5">
        <Row term="Island">{label(destinations, 'slug', record.destination)}</Row>
        <Row term="Guests">{record.guests}</Row>
        <Row term="Dates">{formatStay(record.arrival, record.departure, locale)}</Row>
        <Row term="Level">{label(budgetTiers, 'id', record.budget)}</Row>

        <div className="col-span-2 border-t border-line pt-5">
          <dt className="eyebrow text-muted">Estimated volume</dt>
          <dd className="font-display text-2xl font-light mt-1.5 text-gold">
            {formatRange(record.total, locale)}
            {record.total.unknown > 0 && (
              <span className="text-[0.75rem] text-muted ml-3 font-sans">
                + {record.total.unknown} on request
              </span>
            )}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full border-t border-line px-5 py-4 text-left eyebrow text-muted transition-colors
                   duration-300 hover:text-bone focus-visible:outline focus-visible:outline-1
                   focus-visible:outline-offset-[-4px] focus-visible:outline-gold"
      >
        {record.entries.length} selected {record.entries.length === 1 ? 'arrangement' : 'arrangements'}
        <span aria-hidden="true" className="text-gold ml-3">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <ul className="border-t border-line px-5 py-2">
          {record.entries.map((entry, index) => (
            <li key={index} className="grid grid-cols-[3.25rem_1fr] gap-x-4 border-b border-line/60 py-3 last:border-b-0">
              <span className="eyebrow text-gold/80 pt-1 tabular-nums">{entry.time}</span>
              <div className="min-w-0">
                <p className="eyebrow text-muted">{entry.kategorie}</p>
                <p className="font-display text-[1.125rem] font-light leading-tight mt-1">{entry.name}</p>
                <p className="text-[0.75rem] text-muted/70 mt-1 italic">{entry.price_estimate}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export default function Admin({ locale }) {
  // Read once on mount: the store only changes from the guest flow, which
  // lives on another route.
  const records = useMemo(() => loadRequests(), [])
  const combined = useMemo(() => combineTotals(records), [records])

  return (
    <main className="mx-auto max-w-2xl px-6 pb-32 sm:px-10">
      <header className="pt-14 sm:pt-24">
        <p className="eyebrow text-gold">Desk</p>

        <h1 className="font-display text-[2.5rem] leading-[1.1] font-light mt-8 sm:text-5xl">
          {records.length} {records.length === 1 ? 'request' : 'requests'}
          {records.length > 0 && (
            <span className="block italic text-bone/70">{formatRange(combined, locale)}</span>
          )}
        </h1>

        <p className="text-[0.8125rem] text-muted mt-8 leading-relaxed border-l border-gold/40 pl-5">
          These requests are stored in this browser only. A request raised on a
          guest's phone does not appear here, and clearing site data erases them.
          A shared desk inbox needs a server.
        </p>
      </header>

      {records.length === 0 ? (
        <p className="font-display text-[1.5rem] font-light text-bone/60 mt-20">
          Nothing has been requested on this device yet.
        </p>
      ) : (
        <div className="mt-16 space-y-5 sm:mt-20">
          {records.map((record) => (
            <RequestCard key={record.reference} record={record} locale={locale} />
          ))}
        </div>
      )}

      <Link
        to="/"
        className="inline-block eyebrow text-muted mt-16 border-b border-line pb-2 transition-colors
                   duration-300 hover:text-bone hover:border-gold/50"
      >
        To the guest view
      </Link>
    </main>
  )
}
