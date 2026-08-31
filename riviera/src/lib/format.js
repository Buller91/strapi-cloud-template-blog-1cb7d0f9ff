/**
 * A date range the way a concierge would write it:
 *   12 – 17 September 2026
 *   28 September – 3 October 2026
 *   28 December 2026 – 2 January 2027
 */
export function formatStay(arrival, departure, locale = 'en-GB') {
  const from = new Date(arrival)
  const to = new Date(departure)
  const day = (d) => d.getUTCDate()
  const month = (d) => d.toLocaleDateString(locale, { month: 'long', timeZone: 'UTC' })
  const year = (d) => d.getUTCFullYear()

  if (year(from) !== year(to)) {
    return `${day(from)} ${month(from)} ${year(from)} – ${day(to)} ${month(to)} ${year(to)}`
  }
  if (month(from) !== month(to)) {
    return `${day(from)} ${month(from)} – ${day(to)} ${month(to)} ${year(to)}`
  }
  return `${day(from)} – ${day(to)} ${month(to)} ${year(to)}`
}
