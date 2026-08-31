/**
 * A multi-select plate. Unlike ChoiceCard these are checkboxes: a guest can
 * want a yacht and a private chef and nothing else.
 */
export default function ServiceChip({ name, checked, onChange, label }) {
  return (
    <label
      className={[
        'group relative flex cursor-pointer items-center gap-3 border px-4 py-4 transition-colors duration-300',
        'has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-gold',
        checked ? 'border-gold/45 bg-surface' : 'border-line hover:border-line-lit',
      ].join(' ')}
    >
      <input type="checkbox" name={name} checked={checked} onChange={onChange} className="sr-only" />

      <span
        aria-hidden="true"
        className={[
          'flex h-4 w-4 shrink-0 items-center justify-center border text-[0.625rem] leading-none transition-colors duration-300',
          checked ? 'border-gold bg-gold text-ink' : 'border-line-lit text-transparent',
        ].join(' ')}
      >
        ✓
      </span>

      <span className={['text-[0.875rem] leading-snug transition-colors duration-300', checked ? 'text-bone' : 'text-muted'].join(' ')}>
        {label}
      </span>
    </label>
  )
}
