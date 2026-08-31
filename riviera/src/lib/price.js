/**
 * Price estimates in the inventory are prose, not numbers:
 *   "estimate: EUR 250-500 per person, sunbed minimum spend applies"
 *   "estimate: EUR 2,500-6,000 per day for the boat"
 *   "estimate: tables from EUR 2,000, no meaningful walk-in"
 *
 * There is no single correct total for a list of those, so this reads the
 * first EUR figure of each entry into a range and reports a range back.
 * Anything it cannot read is counted separately rather than as zero — a
 * silent zero would understate the total, which is the one failure mode
 * that matters here.
 */

const EUR = /EUR\s*([\d.,]+)(?:\s*[-–—]\s*([\d.,]+))?/i

/** Per-guest units. Everything else (per day, per night, per transfer) is per booking. */
const PER_PERSON = /\b(per person|entry|pp)\b/i

const toNumber = (raw) => Number(raw.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'))

/**
 * @returns {{low: number, high: number, perPerson: boolean, from: boolean} | null}
 */
export function parseEstimate(text) {
  if (typeof text !== 'string') return null

  const match = EUR.exec(text)
  if (!match) return null

  const low = toNumber(match[1])
  const high = match[2] ? toNumber(match[2]) : low
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null

  // The unit follows the figure: "EUR 80-120 entry, tables from EUR 1,500".
  const trailing = text.slice(match.index + match[0].length, match.index + match[0].length + 24)
  const leading = text.slice(Math.max(0, match.index - 12), match.index)

  return {
    low: Math.min(low, high),
    high: Math.max(low, high),
    perPerson: PER_PERSON.test(trailing),
    from: /\bfrom\s*$/i.test(leading),
  }
}

/**
 * @returns {{low: number, high: number, unknown: number, from: boolean, counted: number}}
 */
export function sumEstimates(entries, guests) {
  let low = 0
  let high = 0
  let unknown = 0
  let from = false
  let counted = 0

  for (const entry of entries) {
    const parsed = parseEstimate(entry.price_estimate)
    if (!parsed) {
      unknown += 1
      continue
    }
    const multiplier = parsed.perPerson ? guests : 1
    low += parsed.low * multiplier
    high += parsed.high * multiplier
    from = from || parsed.from
    counted += 1
  }

  return { low, high, unknown, from, counted }
}

export function formatEuro(value, locale = 'en-GB') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

/** "€4,200 – €9,800", "from €2,000", "—" when nothing is priced. */
export function formatRange({ low, high, from, counted }, locale = 'en-GB') {
  if (counted === 0) return '—'
  const prefix = from ? 'from ' : ''
  if (low === high) return prefix + formatEuro(low, locale)
  return `${prefix}${formatEuro(low, locale)} – ${formatEuro(high, locale)}`
}
