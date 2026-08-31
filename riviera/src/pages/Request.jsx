import { formatRange } from '../lib/price.js'

/**
 * Where the request is handed over. Sending it — mail, WhatsApp, clipboard —
 * is the next phase; this screen states plainly that nothing has gone out yet
 * rather than implying a booking was made.
 */
export default function Request({ entries, total, locale, onBack }) {
  return (
    <main className="mx-auto max-w-2xl px-6 pb-32 sm:px-10">
      <header className="pt-14 sm:pt-24">
        <p className="eyebrow text-gold">Ready to send</p>

        <h1 className="font-display text-[2.5rem] leading-[1.1] font-light mt-8 sm:text-5xl">
          {entries.length} {entries.length === 1 ? 'arrangement' : 'arrangements'}
          <span className="block italic text-bone/70">{formatRange(total, locale)}</span>
        </h1>

        <p className="text-[0.8125rem] text-muted mt-6 leading-relaxed">
          Nothing has been sent yet. Handing this to the desk — by mail or
          WhatsApp — is the next step to build.
        </p>
      </header>

      <ul className="mt-16">
        {entries.map((entry, index) => (
          <li key={index} className="grid grid-cols-[3.25rem_1fr] gap-x-4 border-t border-line py-5 sm:grid-cols-[4.5rem_1fr]">
            <span className="eyebrow text-gold/80 pt-1 tabular-nums">{entry.time}</span>
            <div>
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
