import PlanItem from './PlanItem.jsx'
import { formatDay } from '../lib/format.js'

/** One card per day of the stay. */
export default function DayCard({ date, items, index, isSelected, onToggle, locale, visualFor }) {
  const chosen = items.filter((_, i) => isSelected(date, i)).length

  return (
    <article className="border border-line bg-ink">
      <header className="flex items-baseline justify-between gap-4 px-5 pt-6 pb-5">
        <div className="min-w-0">
          <p className="eyebrow text-gold/70">Day {index + 1}</p>
          <h3 className="font-display text-[1.5rem] font-light leading-tight mt-2 truncate">
            {formatDay(date, locale)}
          </h3>
        </div>

        <p className="eyebrow text-muted shrink-0 tabular-nums">
          {chosen}/{items.length}
        </p>
      </header>

      {items.map((item, i) => (
        <PlanItem
          key={`${date}-${i}`}
          item={item}
          visual={visualFor(item.name)}
          selected={isSelected(date, i)}
          onToggle={() => onToggle(date, i)}
        />
      ))}
    </article>
  )
}
