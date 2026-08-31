export default function DateField({ id, label, value, min, onChange }) {
  return (
    <div className="flex-1">
      <label htmlFor={id} className="eyebrow text-muted block">
        {label}
      </label>

      <input
        id={id}
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="mt-3 w-full bg-transparent border-0 border-b border-line pb-3 font-display text-2xl font-light
                   text-bone transition-colors duration-300 hover:border-line-lit
                   focus:border-gold/60 focus:outline-none"
      />
    </div>
  )
}
