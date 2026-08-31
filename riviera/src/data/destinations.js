/**
 * The three destinations. `slug` is the stable id; `name` matches the
 * `insel` values in inventory.json so the two files can be joined.
 *
 * @typedef {{ slug: string, name: string, region: string, note: string }} Destination
 * @type {Destination[]}
 */
export const destinations = [
  {
    slug: 'mykonos',
    name: 'Mykonos',
    region: 'Cyclades, Greece',
    note: 'Long lunches, late rooms.',
  },
  {
    slug: 'ibiza',
    name: 'Ibiza',
    region: 'Balearics, Spain',
    note: 'The music, and the quiet north.',
  },
  {
    slug: 'st-tropez',
    name: 'St. Tropez',
    region: 'Côte d’Azur, France',
    note: 'Pampelonne, from noon onward.',
  },
]

/** @type {{ id: string, name: string, note: string }[]} */
export const budgetTiers = [
  {
    id: 'standard',
    name: 'Standard',
    note: 'Considered choices. The right table, without the bottle parade.',
  },
  {
    id: 'vip',
    name: 'VIP',
    note: 'Front row throughout — beach beds, table service, private transfers.',
  },
  {
    id: 'no-limit',
    name: 'No Limit',
    note: 'Nothing ruled out in advance. If it can be arranged, we arrange it.',
  },
]
