import { formatRange } from '../lib/price.js'

/**
 * The handover point. The request is recorded in this browser and given a
 * reference; it has not reached anyone. Saying otherwise would be the one
 * lie this screen must not tell.
 */
export default function Request({ record, stored, locale, onBack }) {
  return (
    <main className="mx-auto max-w-2xl px-6 pb-32 sm:px-10">
      <header className="pt-14 sm:pt-24">
        <p className="eyebrow text-gold tabular-nums">{record.reference}</p>

        <h1 className="font-display text-[2.5rem] leading-[1.1] font-light mt-8 sm:text-5xl">
          {record.entries.length} {record.entries.length === 1 ? 'arrangement' : 'arrangements'}
          <span className="block italic text-bone/70">{formatRange(record.total, locale)}</span>
        </h1>

        <p className="text-[0.8125rem] text-muted mt-8 leading-relaxed">
          {stored
            ? 'Noted under this reference on this device. It has not reached the desk yet — sending it, by mail or WhatsApp, is the next step to build.'
            : 'This browser would not store the request, so it will be gone when you leave the page. Keep the reference above.'}
        </p>
      </header>

      <ul className="mt-16">
        {record.entries.map((entry, index) => (
          <li key={index} className="grid grid-cols-[3.25rem_1fr] gap-x-4 border-t border-line py-5 sm:grid-cols-[4.5rem_1fr]">
            <span className="eyebrow text-gold/80 pt-1 tabular-nums">{entry.time}</span>
            <div className="min-w-0">
              <p className="font-display text-[1.25rem] font-light leading-tight">{entry.name}</p>
              <p className="text-[0.75rem] text-muted/70 mt-1 italic">{entry.price_estimate}</p>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onBack}
        className="eyebrow text-muted mt-12 border-b border-line pb-2 transition-colors duration-300
                   hover:text-bone hover:border-gold/50"
      >
        Back to the programme
      </button>
    </main>
  )
}
