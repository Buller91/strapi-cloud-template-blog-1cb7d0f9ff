/** A thin ring with a single gold arc. No text, no bounce. */
export default function Spinner({ label }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label={label}
      className="h-12 w-12 animate-spin [animation-duration:1.6s] motion-reduce:animate-none"
    >
      <circle cx="24" cy="24" r="22" fill="none" strokeWidth="1" className="stroke-line" />
      <path d="M24 2a22 22 0 0 1 22 22" fill="none" strokeWidth="1" strokeLinecap="round" className="stroke-gold" />
    </svg>
  )
}
