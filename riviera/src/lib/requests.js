/**
 * Requests live in this browser and nowhere else. There is no server to
 * post them to, so a request raised on a guest's phone is invisible to the
 * desk's laptop. Every screen that reads this store has to say so.
 */
const KEY = 'riviera.requests.v1'
const VERSION = 1

/** No 0/O or 1/I — references get read aloud over the phone. */
const ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY3479'

function reference(now) {
  const stamp = now.toISOString().slice(2, 10).replace(/-/g, '')
  let tail = ''
  const random = crypto.getRandomValues(new Uint8Array(4))
  for (const byte of random) tail += ALPHABET[byte % ALPHABET.length]
  return `RIV-${stamp}-${tail}`
}

/** localStorage throws in private mode and when site data is blocked. */
function read() {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

function write(records) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(records))
    return true
  } catch {
    return false
  }
}

const isTotal = (t) =>
  t && ['low', 'high', 'unknown', 'counted'].every((k) => typeof t[k] === 'number')

/** A record written by an older or broken build is dropped, not repaired. */
function isValid(record) {
  return (
    record &&
    record.version === VERSION &&
    typeof record.reference === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.destination === 'string' &&
    typeof record.arrival === 'string' &&
    typeof record.departure === 'string' &&
    Number.isInteger(record.guests) &&
    Array.isArray(record.entries) &&
    isTotal(record.total)
  )
}

/**
 * @returns {{record: object, stored: boolean}} `stored` is false when the
 * browser refused to persist — the caller can still show the reference.
 */
export function saveRequest({ brief, entries, total }) {
  const now = new Date()
  const record = {
    version: VERSION,
    reference: reference(now),
    createdAt: now.toISOString(),
    destination: brief.destination,
    arrival: brief.arrival,
    departure: brief.departure,
    guests: brief.guests,
    budget: brief.budget,
    entries: entries.map(({ time, name, kategorie, price_estimate }) => ({
      time,
      name,
      kategorie,
      price_estimate,
    })),
    total,
  }

  return { record, stored: write([record, ...read().filter(isValid)]) }
}

/** Newest first. */
export function loadRequests() {
  return read()
    .filter(isValid)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function combineTotals(records) {
  return records.reduce(
    (sum, { total }) => ({
      low: sum.low + total.low,
      high: sum.high + total.high,
      unknown: sum.unknown + total.unknown,
      counted: sum.counted + total.counted,
      from: sum.from || Boolean(total.from),
    }),
    { low: 0, high: 0, unknown: 0, counted: 0, from: false },
  )
}
