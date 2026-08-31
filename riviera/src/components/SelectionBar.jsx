import { formatRange } from '../lib/price.js'

/**
 * Runs along the bottom of the programme. The total is a range because the
 * inventory prices are ranges — collapsing it to one figure would invent
 * precision the desk has not promised.
 */
export default function SelectionBar({ total, count, locale, onRequest }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-ink/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-5 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-10">
        <div className="min-w-0">
          <p className="eyebrow text-muted">
            {count} selected
            {total.unknown > 0 && ` · ${total.unknown} on request`}
          </p>

          <p className="font-display text-[1.375rem] font-light leading-tight mt-1 truncate sm:text-2xl">
            {count === 0 ? '—' : formatRange(total, locale)}
          </p>
        </div>

        <button
          type="button"
          onClick={onRequest}
          disabled={count === 0}
          className="shrink-0 border border-gold/50 px-5 py-4 eyebrow text-bone transition-colors duration-300
                     hover:enabled:bg-gold hover:enabled:text-ink hover:enabled:border-gold
                     focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold
                     disabled:border-line disabled:text-muted disabled:cursor-not-allowed sm:px-8"
        >
          Request booking
        </button>
      </div>
    </div>
  )
}
