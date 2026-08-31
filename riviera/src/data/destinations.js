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
    image: '/images/destination-mykonos.svg',
    name: 'Mykonos',
    region: 'Cyclades, Greece',
    note: 'Long lunches, late rooms.',
  },
  {
    slug: 'ibiza',
    image: '/images/destination-ibiza.svg',
    name: 'Ibiza',
    region: 'Balearics, Spain',
    note: 'The music, and the quiet north.',
  },
  {
    slug: 'st-tropez',
    image: '/images/destination-st-tropez.svg',
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

/**
 * The desk's menu of services. `id` matches `kategorie` in inventory.json,
 * so a guest's choices filter the inventory directly.
 *
 * @type {{ id: string, name: string }[]}
 */
export const services = [
  { id: 'beachclub', name: 'Beach & day clubs' },
  { id: 'restaurant', name: 'Dining' },
  { id: 'club', name: 'Nightlife' },
  { id: 'bottle-service', name: 'VIP tables & bottle service' },
  { id: 'yacht', name: 'Yacht & boat days' },
  { id: 'watersports', name: 'Jet ski & watersports' },
  { id: 'car', name: 'Cars & supercars' },
  { id: 'transfer', name: 'Transfers & helicopter' },
  { id: 'villa', name: 'Villas' },
  { id: 'wellness', name: 'Spa, beauty & training' },
  { id: 'chef', name: 'Private chef' },
  { id: 'experience', name: 'Culture & vineyards' },
]
