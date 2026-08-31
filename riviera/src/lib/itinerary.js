import inventory from '../data/inventory.json'

/**
 * The form asks four questions, none of them free text, so there is nothing
 * in the answers to detect a language from. The browser's own locale is the
 * closest honest signal we have.
 */
export function guestLanguage() {
  return (typeof navigator !== 'undefined' && navigator.language) || 'en'
}

const ISLANDS = { mykonos: 'Mykonos', ibiza: 'Ibiza', 'st-tropez': 'St. Tropez' }

/**
 * The model is never asked to echo an image path — it would invent one.
 * The plate is looked up from the inventory by the venue's own name.
 */
export function imageFor(name, destination) {
  return inventory.items.find((i) => i.insel === ISLANDS[destination] && i.name === name)?.image ?? null
}

/**
 * The model is told to copy venue names verbatim from the inventory. This
 * checks that it did — a name we do not stock is a venue nobody can book.
 */
function checkAgainstInventory(plan, destination) {
  const known = new Set(
    inventory.items.filter((i) => i.insel === ISLANDS[destination]).map((i) => i.name),
  )
  const unknown = []

  for (const day of plan.days) {
    for (const item of day.items) {
      if (!known.has(item.name)) unknown.push(item.name)
    }
  }
  return unknown
}

/** Guards against a well-formed but empty plan. */
function assertUsable(plan) {
  if (!plan?.days?.length) throw new Error('The desk returned an empty plan.')
  if (plan.days.some((day) => !day.items?.length)) throw new Error('The desk returned a day with nothing in it.')
}

/**
 * @returns {Promise<{ days: Array, unknown: string[] }>}
 */
export async function requestItinerary(brief, { signal } = {}) {
  const response = await fetch('/api/itinerary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...brief, language: guestLanguage() }),
    signal,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || `The desk did not answer (${response.status}).`)
  }

  assertUsable(payload)
  return { days: payload.days, unknown: checkAgainstInventory(payload, brief.destination) }
}
