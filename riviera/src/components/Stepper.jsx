const BTN =
  'h-12 w-12 border border-line text-muted text-xl leading-none transition-colors duration-300 ' +
  'hover:enabled:border-gold/45 hover:enabled:text-bone ' +
  'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold ' +
  'disabled:opacity-25 disabled:cursor-not-allowed'

export default function Stepper({ label, value, min, max, onChange }) {
  return (
    <div className="flex items-center gap-6">
      <button type="button" className={BTN} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`One ${label} fewer`}>
        &minus;
      </button>

      <output className="font-display text-5xl font-light tabular-nums w-14 text-center" aria-live="polite">
        {value}
      </output>

      <button type="button" className={BTN} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`One ${label} more`}>
        +
      </button>

      <span className="text-[0.8125rem] text-muted">
        {value === 1 ? 'guest' : 'guests'}
      </span>
    </div>
  )
}
