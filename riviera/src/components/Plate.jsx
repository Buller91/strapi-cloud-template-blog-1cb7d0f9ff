import { useState } from 'react'

/**
 * The picture above an entry. A photograph when the desk has one, the
 * generated plate otherwise — and the plate again if the photograph fails
 * to load, so a missing file degrades instead of leaving a broken frame.
 */
export default function Plate({ visual, alt, dimmed }) {
  const [failed, setFailed] = useState(false)
  if (!visual) return null

  const showingPhoto = visual.isPhoto && !failed

  return (
    <figure className="mb-5">
      <img
        src={failed ? visual.plate : visual.src}
        alt={showingPhoto ? alt : ''}
        width="1200"
        height="800"
        loading="lazy"
        onError={() => setFailed(true)}
        className={[
          'block aspect-[16/7] w-full object-cover transition-opacity duration-300',
          dimmed ? 'opacity-45' : 'opacity-100',
        ].join(' ')}
      />

      {showingPhoto && visual.credit && (
        <figcaption className="mt-2 text-[0.625rem] text-muted/70 leading-relaxed">
          {visual.credit.author}
          {visual.credit.source && ` · ${visual.credit.source}`}
          {visual.credit.license && ` · ${visual.credit.license}`}
        </figcaption>
      )}
    </figure>
  )
}
