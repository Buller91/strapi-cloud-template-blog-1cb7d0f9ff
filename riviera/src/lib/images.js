import inventory from '../data/inventory.json'
import photos from '../data/photos.json'

const ISLANDS = { mykonos: 'Mykonos', ibiza: 'Ibiza', 'st-tropez': 'St. Tropez' }

/** Stable per name, so an entry keeps the same photo between renders. */
function pick(list, key) {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return list[Math.abs(h) % list.length]
}

/**
 * What to show for one entry of the programme.
 *
 * A real photograph when the desk has one for that island and category,
 * otherwise the generated plate. `plate` always comes back too, so the view
 * can fall back if a photo fails to load in the browser.
 *
 * @returns {{ src: string, plate: string, credit: object|null, isPhoto: boolean } | null}
 */
export function visualFor(name, destination) {
  const item = inventory.items.find(
    (entry) => entry.insel === ISLANDS[destination] && entry.name === name,
  )
  if (!item) return null

  const set = photos.sets?.[`${item.insel}|${item.kategorie}`]
  if (set?.length) {
    const photo = pick(set, name)
    return { src: photo.file, plate: item.image, credit: photo.credit ?? null, isPhoto: true }
  }

  return { src: item.image, plate: item.image, credit: null, isPhoto: false }
}

/** True once any real photography has been indexed. */
export const hasPhotography = Object.keys(photos.sets ?? {}).length > 0
