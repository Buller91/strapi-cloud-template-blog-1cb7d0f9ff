/**
 * Indexes whatever real photography sits in public/photos into
 * src/data/photos.json, which is what the app reads.
 *
 * Name each file  <island>-<category>[-n].<ext>  e.g.
 *   mykonos-beachclub-1.jpg      ibiza-yacht.jpg
 *   st-tropez-restaurant-2.webp
 *
 * Islands:    mykonos | ibiza | st-tropez
 * Categories: the twelve in inventory.json meta.categories
 *
 * Attribution, where the licence needs it, goes in public/photos/credits.json:
 *   { "mykonos-beachclub-1.jpg": { "author": "…", "source": "Unsplash",
 *     "sourceUrl": "https://…", "license": "Unsplash License" } }
 *
 * Run: node scripts/index-photos.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('..', import.meta.url)
const read = (rel) => JSON.parse(readFileSync(new URL(rel, root), 'utf8'))

const inventory = read('src/data/inventory.json')
const CATEGORIES = inventory.meta.categories
const ISLANDS = { mykonos: 'Mykonos', ibiza: 'Ibiza', 'st-tropez': 'St. Tropez' }
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])

const dir = fileURLToPath(new URL('public/photos/', root))
const creditsPath = new URL('public/photos/credits.json', root)
const credits = existsSync(fileURLToPath(creditsPath)) ? read('public/photos/credits.json') : {}

/** "st-tropez-bottle-service-2.jpg" -> island "st-tropez", category "bottle-service". */
function parse(filename) {
  const dot = filename.lastIndexOf('.')
  if (dot < 0 || !EXTENSIONS.has(filename.slice(dot).toLowerCase())) return null

  let stem = filename.slice(0, dot)
  stem = stem.replace(/-\d+$/, '')

  const island = Object.keys(ISLANDS).find((key) => stem === key || stem.startsWith(`${key}-`))
  if (!island) return null

  const category = stem.slice(island.length + 1)
  if (!CATEGORIES.includes(category)) return null

  return { island: ISLANDS[island], category }
}

const sets = {}
const skipped = []

for (const filename of readdirSync(dir).sort()) {
  if (filename === 'credits.json' || filename === '.gitkeep') continue

  const parsed = parse(filename)
  if (!parsed) {
    skipped.push(filename)
    continue
  }

  const key = `${parsed.island}|${parsed.category}`
  ;(sets[key] ??= []).push({
    file: `/photos/${filename}`,
    credit: credits[filename] ?? null,
  })
}

writeFileSync(
  new URL('src/data/photos.json', root),
  JSON.stringify(
    {
      meta: {
        note: "Written by scripts/index-photos.mjs. Keys are '<island>|<category>'. Empty means the app falls back to the generated plates in public/images.",
        generated: new Date().toISOString(),
      },
      sets,
    },
    null,
    2,
  ) + '\n',
)

const total = Object.values(sets).reduce((n, list) => n + list.length, 0)
console.log(`indexed ${total} photo${total === 1 ? '' : 's'} across ${Object.keys(sets).length} island/category sets`)

if (skipped.length) {
  console.log(`\nignored (name does not parse): ${skipped.join(', ')}`)
  console.log('expected <island>-<category>[-n].<ext>, e.g. mykonos-beachclub-1.jpg')
}

// Say plainly where the plates still show, so nobody assumes full coverage.
const gaps = []
for (const island of Object.values(ISLANDS)) {
  for (const category of CATEGORIES) if (!sets[`${island}|${category}`]) gaps.push(`${island}/${category}`)
}
if (gaps.length) console.log(`\nstill on generated plates (${gaps.length}): ${gaps.join(', ')}`)
