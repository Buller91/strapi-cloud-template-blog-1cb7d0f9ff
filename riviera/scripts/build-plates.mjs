/**
 * Generates one abstract plate per inventory entry into public/images.
 *
 * These are NOT photographs of the venues. Nobody can license a real photo
 * of Nammos from a build script, and a stock photo standing in for a named
 * venue would misrepresent it. So each entry gets a generated duotone plate
 * carrying its category's motif: honest, tiny, and it holds the page's art
 * direction until real photography is shot and licensed. Replacing one is a
 * matter of dropping a file at the same path.
 *
 * Run: node scripts/build-plates.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('..', import.meta.url)
const inventory = JSON.parse(readFileSync(new URL('src/data/inventory.json', root), 'utf8'))

/** Dark, muted grounds — bone text stays legible over every one of them. */
const TINT = {
  beachclub: '#3a2f1e',
  restaurant: '#2e1c1c',
  club: '#221a2e',
  'bottle-service': '#332a16',
  yacht: '#14242e',
  watersports: '#10262a',
  car: '#232323',
  transfer: '#1b2230',
  villa: '#232a1e',
  wellness: '#1e2926',
  chef: '#2c2118',
  experience: '#262320',
}

/** Each motif is drawn in a 0 0 200 200 box and placed by the template. */
const MOTIF = {
  beachclub: '<circle cx="100" cy="96" r="42"/><path d="M20 150h160M44 52 30 38M156 52l14-14"/>',
  restaurant: '<path d="M62 40h76a0 0 0 0 1 0 0c0 34-17 56-38 56S62 74 62 40zM100 96v56M72 152h56"/>',
  club: '<path d="M100 40a60 60 0 0 1 0 120 60 60 0 0 1 0-120z"/><path d="M100 68a32 32 0 0 1 0 64 32 32 0 0 1 0-64z"/><circle cx="100" cy="100" r="8"/>',
  'bottle-service': '<path d="M86 28h28v34l20 34v76H66V96l20-34z"/><path d="M66 116h68"/>',
  yacht: '<path d="M24 148h152l-22 34H46zM100 24v112M100 40l52 88h-52"/>',
  watersports: '<path d="M16 92c24-22 44-22 68 0s44 22 68 0M16 128c24-22 44-22 68 0s44 22 68 0M16 56c24-22 44-22 68 0s44 22 68 0"/>',
  car: '<path d="M20 132h160M34 132l14-38c3-8 9-12 18-12h68c9 0 15 4 18 12l14 38"/><circle cx="62" cy="140" r="14"/><circle cx="138" cy="140" r="14"/>',
  transfer: '<path d="M24 56h152M100 56v26M52 108h74c14 0 22 8 22 20v14H60c-10 0-18-8-18-18s2-16 10-16z"/><path d="M126 128l44 22"/>',
  villa: '<path d="M36 92 100 40l64 52M52 92v52h96V92M24 168h152"/>',
  wellness: '<circle cx="78" cy="100" r="44"/><circle cx="122" cy="100" r="44"/>',
  chef: '<path d="M40 132a60 60 0 0 1 120 0zM24 148h152M100 60v12"/>',
  experience: '<path d="M32 56h136M44 56v96M84 56v96M116 56v96M156 56v96M24 168h152"/>',
}

/** Small deterministic hash so a plate never changes between runs. */
function seedOf(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function plate(item) {
  const seed = seedOf(item.insel + item.name)
  const tint = TINT[item.kategorie]
  const glowX = 22 + (seed % 56)
  const glowY = 18 + ((seed >> 6) % 44)
  const angle = 100 + ((seed >> 12) % 80)
  const motifX = (seed >> 18) % 2 ? 700 : 240
  const scale = 1.5 + (((seed >> 20) % 5) / 10)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-label="${item.kategorie}">
<defs>
<linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)">
<stop offset="0" stop-color="${tint}"/><stop offset="1" stop-color="#0b0a09"/>
</linearGradient>
<radialGradient id="w" cx="${glowX}%" cy="${glowY}%" r="62%">
<stop offset="0" stop-color="#c2a15f" stop-opacity=".30"/>
<stop offset="1" stop-color="#c2a15f" stop-opacity="0"/>
</radialGradient>
<filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3"/>
<feColorMatrix type="saturate" values="0"/></filter>
</defs>
<rect width="1200" height="800" fill="url(#g)"/>
<rect width="1200" height="800" fill="url(#w)"/>
<g transform="translate(${motifX} ${400 - 100 * scale}) scale(${scale})" fill="none"
   stroke="#c2a15f" stroke-opacity=".27" stroke-width="2.5"
   stroke-linecap="round" stroke-linejoin="round">${MOTIF[item.kategorie]}</g>
<rect width="1200" height="800" filter="url(#n)" opacity=".055"/>
</svg>
`
}

mkdirSync(fileURLToPath(new URL('public/images/', root)), { recursive: true })

let bytes = 0
for (const item of inventory.items) {
  const svg = plate(item)
  bytes += svg.length
  writeFileSync(new URL('public' + item.image, root), svg)
}
console.log(`${inventory.items.length} plates, ${(bytes / 1024).toFixed(0)} KB total`)
