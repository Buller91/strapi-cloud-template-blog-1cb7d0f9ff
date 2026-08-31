/**
 * One numbered question in the brief. The number is decorative — the
 * legend carries the accessible name for the group of controls.
 */
export default function Section({ index, title, hint, error, children }) {
  const errorId = `section-${index}-error`

  return (
    <fieldset className="min-w-0" aria-describedby={error ? errorId : undefined}>
      <legend className="sr-only">{title}</legend>

      <div aria-hidden="true" className="flex items-baseline gap-4">
        <span className="eyebrow text-gold/70">{index}</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <h2 className="font-display text-[1.75rem] leading-tight font-light mt-5 sm:text-[2.125rem]">
        {title}
      </h2>

      {hint && <p className="text-[0.8125rem] text-muted mt-2 leading-relaxed">{hint}</p>}

      <div className="mt-7">{children}</div>

      {error && (
        <p id={errorId} role="alert" className="text-[0.8125rem] text-gold mt-4">
          {error}
        </p>
      )}
    </fieldset>
  )
}
