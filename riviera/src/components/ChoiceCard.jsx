/**
 * A radio rendered as a full-width plate. The input stays in the DOM and
 * keeps native keyboard and screen-reader behaviour; only its box is hidden.
 */
export default function ChoiceCard({ name, value, checked, onChange, title, meta, note, image }) {
  return (
    <label
      className={[
        'group relative block cursor-pointer border transition-colors duration-300',
        image ? 'pb-6' : 'px-5 py-6',
        'has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-gold',
        checked ? 'border-gold/45 bg-surface' : 'border-line bg-transparent hover:border-line-lit',
      ].join(' ')}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />

      {image && (
        <img
          src={image}
          alt=""
          width="1200"
          height="450"
          loading="lazy"
          className={[
            'mb-5 block aspect-[16/6] w-full object-cover transition-opacity duration-300',
            checked ? 'opacity-100' : 'opacity-55 group-hover:opacity-75',
          ].join(' ')}
        />
      )}

      <div className={image ? 'px-5' : ''}>

      {meta && (
        <span className={['eyebrow block mb-2 transition-colors duration-300', checked ? 'text-gold/80' : 'text-muted'].join(' ')}>
          {meta}
        </span>
      )}

      <span
        className={[
          'font-display block text-[1.625rem] leading-none font-light transition-colors duration-300',
          checked ? 'text-bone' : 'text-bone/80',
        ].join(' ')}
      >
        {title}
      </span>

      {note && <span className="block text-[0.8125rem] text-muted mt-3 leading-relaxed">{note}</span>}

      </div>

      <span
        aria-hidden="true"
        className={[
          'absolute left-0 top-0 h-full w-px bg-gold transition-transform duration-300 origin-top',
          checked ? 'scale-y-100' : 'scale-y-0',
        ].join(' ')}
      />
    </label>
  )
}
