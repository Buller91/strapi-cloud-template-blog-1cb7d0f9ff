/**
 * Downloads real, licensed photography into public/photos and writes the
 * attribution into public/photos/credits.json. Afterwards run
 * `node scripts/index-photos.mjs` to make the app pick them up.
 *
 *   UNSPLASH_ACCESS_KEY=… node scripts/fetch-photos.mjs
 *   PEXELS_API_KEY=…      node scripts/fetch-photos.mjs
 *   node scripts/fetch-photos.mjs --dry-run --per 3
 *
 * Both providers offer a free key. The photographs are representative of
 * the island and the kind of thing on offer — they are not pictures of the
 * named venue, which is why the app labels them as credits rather than as
 * the venue itself. For venue photography, get it from the venue and drop
 * it into public/photos by hand; see scripts/index-photos.mjs.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('..', import.meta.url)
const CATEGORIES = JSON.parse(readFileSync(new URL('src/data/inventory.json', root), 'utf8')).meta.categories
const ISLANDS = { mykonos: 'Mykonos', ibiza: 'Ibiza', 'st-tropez': 'St. Tropez' }

/** What to search for. Edit freely — these are the whole art direction. */
const QUERY = {
  beachclub: (island) => `${island} beach club daybeds sea`,
  restaurant: (island) => `${island} restaurant terrace dinner mediterranean`,
  club: () => 'nightclub crowd lights dj booth',
  'bottle-service': () => 'champagne bottles nightclub table service',
  yacht: () => 'luxury yacht mediterranean sea deck',
  watersports: () => 'jet ski turquoise sea speed',
  car: () => 'convertible sports car coastal road',
  transfer: () => 'helicopter coastline luxury travel',
  villa: () => 'luxury villa infinity pool mediterranean',
  wellness: () => 'spa massage treatment calm',
  chef: () => 'private chef outdoor long table dinner',
  experience: (island) =>
    island === 'Mykonos' ? 'Delos greece ancient ruins'
      : island === 'Ibiza' ? 'Ibiza Dalt Vila old town walls'
      : 'provence vineyard rose wine',
}

const args = process.argv.slice(2)
const has = (flag) => args.includes(flag)
const value = (flag, fallback) => {
  const i = args.indexOf(flag)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

const perSet = Number(value('--per', '2'))
const dryRun = has('--dry-run')

const providers = {
  unsplash: {
    key: process.env.UNSPLASH_ACCESS_KEY,
    url: (q, n) => `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=${n}&orientation=landscape&content_filter=high`,
    headers: (key) => ({ Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' }),
    parse(body) {
      if (!Array.isArray(body?.results)) throw new Error('Unsplash: no results array in response')
      return body.results.map((photo) => {
        const src = photo?.urls?.raw
        const author = photo?.user?.name
        if (!src || !author) throw new Error('Unsplash: result missing urls.raw or user.name')
        return {
          download: `${src}&w=1400&fm=jpg&q=80&fit=max`,
          credit: {
            author,
            authorUrl: photo.user?.links?.html ?? null,
            source: 'Unsplash',
            sourceUrl: photo.links?.html ?? null,
            license: 'Unsplash License',
          },
        }
      })
    },
  },
  pexels: {
    key: process.env.PEXELS_API_KEY,
    url: (q, n) => `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${n}&orientation=landscape`,
    headers: (key) => ({ Authorization: key }),
    parse(body) {
      if (!Array.isArray(body?.photos)) throw new Error('Pexels: no photos array in response')
      return body.photos.map((photo) => {
        const src = photo?.src?.large
        const author = photo?.photographer
        if (!src || !author) throw new Error('Pexels: result missing src.large or photographer')
        return {
          download: src,
          credit: {
            author,
            authorUrl: photo.photographer_url ?? null,
            source: 'Pexels',
            sourceUrl: photo.url ?? null,
            license: 'Pexels License',
          },
        }
      })
    },
  },
}

// A dry run needs no key, so fall back to a provider for the query preview.
const detected = Object.keys(providers).find((id) => providers[id].key)
const name = value('--provider', detected ?? (dryRun ? 'unsplash' : undefined))
const provider = providers[name]

if (!provider) {
  console.error('No provider. Set UNSPLASH_ACCESS_KEY or PEXELS_API_KEY, or pass --provider.')
  process.exit(1)
}
if (!provider.key && !dryRun) {
  console.error(`No API key for ${name}. Both providers issue one free.`)
  process.exit(1)
}

const dir = new URL('public/photos/', root)
mkdirSync(fileURLToPath(dir), { recursive: true })

const creditsFile = fileURLToPath(new URL('credits.json', dir))
const credits = existsSync(creditsFile) ? JSON.parse(readFileSync(creditsFile, 'utf8')) : {}

let written = 0
for (const island of Object.values(ISLANDS)) {
  const slug = Object.keys(ISLANDS).find((key) => ISLANDS[key] === island)

  for (const category of CATEGORIES) {
    const query = QUERY[category](island)

    if (dryRun) {
      console.log(`${slug}-${category}: "${query}" x${perSet}`)
      continue
    }

    const response = await fetch(provider.url(query, perSet), { headers: provider.headers(provider.key) })
    if (!response.ok) {
      console.error(`${name} returned ${response.status} for "${query}". Stopping so nothing half-written is indexed.`)
      process.exit(1)
    }

    const results = provider.parse(await response.json())
    if (results.length === 0) {
      console.warn(`no results for "${query}" — that set keeps its generated plate`)
      continue
    }

    for (const [index, result] of results.entries()) {
      const filename = `${slug}-${category}-${index + 1}.jpg`
      const image = await fetch(result.download)
      if (!image.ok) {
        console.error(`download failed (${image.status}) for ${filename}`)
        process.exit(1)
      }

      writeFileSync(new URL(filename, dir), Buffer.from(await image.arrayBuffer()))
      credits[filename] = result.credit
      written += 1
      console.log(`  ${filename}  ${result.credit.author} / ${result.credit.source}`)
    }
  }
}

if (!dryRun) {
  writeFileSync(creditsFile, JSON.stringify(credits, null, 2) + '\n')
  console.log(`\n${written} photographs written. Now run: node scripts/index-photos.mjs`)
}
