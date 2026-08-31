/**
 * One entry of the programme. The whole plate is the toggle, so the tap
 * target is the card rather than the small pill — the pill only shows state.
 */
export default function PlanItem({ item, selected, onToggle }) {
  return (
    <label
      className={[
        'group relative block cursor-pointer border-t border-line px-5 py-6 transition-colors duration-300',
        'has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold',
        selected ? 'bg-surface' : 'bg-transparent',
      ].join(' ')}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="sr-only"
        aria-label={`Add to itinerary: ${item.name} at ${item.time}`}
      />

      <div className="grid grid-cols-[3.25rem_1fr] gap-x-4 sm:grid-cols-[4.5rem_1fr] sm:gap-x-6">
        <span className={['eyebrow pt-1.5 tabular-nums transition-colors duration-300', selected ? 'text-gold' : 'text-muted'].join(' ')}>
          {item.time}
        </span>

        <div className="min-w-0">
          <p className="eyebrow text-muted">{item.kategorie}</p>

          <h4 className={['font-display text-[1.375rem] font-light leading-tight mt-1 transition-colors duration-300', selected ? 'text-bone' : 'text-bone/60'].join(' ')}>
            {item.name}
          </h4>

          <p className="text-[0.8125rem] text-muted mt-3 leading-relaxed">{item.why}</p>
          <p className="text-[0.75rem] text-muted/70 mt-2 italic">{item.price_estimate}</p>

          <span
            aria-hidden="true"
            className={[
              'mt-4 inline-flex items-center gap-2 border px-3 py-2 eyebrow transition-colors duration-300',
              selected
                ? 'border-gold/45 text-gold'
                : 'border-line text-muted group-hover:border-line-lit group-hover:text-bone/70',
            ].join(' ')}
          >
            <span className="text-[0.75rem] leading-none">{selected ? '✓' : '+'}</span>
            {selected ? 'Added' : 'Add to itinerary'}
          </span>
        </div>
      </div>

      <span
        aria-hidden="true"
        className={[
          'absolute left-0 top-0 h-full w-px bg-gold transition-transform duration-300 origin-top',
          selected ? 'scale-y-100' : 'scale-y-0',
        ].join(' ')}
      />
    </label>
  )
}
