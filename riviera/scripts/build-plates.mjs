/**
 * Generates the pictures the app falls back to when the desk has no
 * photograph: one per inventory entry, one per destination, and a hero.
 *
 * These are NOT photographs of the venues. Nobody can license a real photo
 * of Nammos from a build script, and stock standing in for a named venue
 * would misrepresent it. So each is a composed scene — a sky, a light, a
 * horizon, a silhouette — in the warmth the hour actually has: afternoon
 * over water for a beach club, candlelight for a table, gold for a room at
 * two in the morning. Warm and lit rather than cold and diagrammatic,
 * because the page has to feel like hospitality.
 *
 * Real photography replaces them without touching code — see the README.
 *
 * Run: node scripts/build-plates.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('..', import.meta.url)
const inventory = JSON.parse(readFileSync(new URL('src/data/inventory.json', root), 'utf8'))

/**
 * Each scene is a time of day: sky overhead, the colour at the horizon, the
 * light source itself, and the ground or water below.
 */
const SCENE = {
  beachclub:        { sky: '#22384a', horizon: '#e0a86a', light: '#ffd8a2', ground: '#1a3a45', line: 0.58, form: 'parasols' },
  restaurant:       { sky: '#2b1d23', horizon: '#d4884f', light: '#ffc98a', ground: '#221a1d', line: 0.66, form: 'arch' },
  club:             { sky: '#171630', horizon: '#b0785c', light: '#ffcf9a', ground: '#141227', line: 0.74, form: 'crowd' },
  'bottle-service': { sky: '#1f192b', horizon: '#c2a15f', light: '#ffe3ad', ground: '#181325', line: 0.70, form: 'glasses' },
  yacht:            { sky: '#1b3446', horizon: '#dfa572', light: '#ffd5a3', ground: '#14303f', line: 0.60, form: 'hull' },
  watersports:      { sky: '#1b3f48', horizon: '#86bcbb', light: '#d3e8e2', ground: '#12333c', line: 0.54, form: 'wake' },
  car:              { sky: '#241f2e', horizon: '#d0805f', light: '#ffcaa0', ground: '#1a1622', line: 0.62, form: 'ridge' },
  transfer:         { sky: '#1e2c3e', horizon: '#cfa27f', light: '#ffe0bd', ground: '#172333', line: 0.68, form: 'coast' },
  villa:            { sky: '#2a2a1d', horizon: '#d8ae67', light: '#ffe1a3', ground: '#20241b', line: 0.58, form: 'cypress' },
  wellness:         { sky: '#26302a', horizon: '#c8c29c', light: '#f0ead6', ground: '#1c2622', line: 0.64, form: 'leaves' },
  chef:             { sky: '#291d17', horizon: '#d4884a', light: '#ffcd90', ground: '#1e1612', line: 0.68, form: 'table' },
  experience:       { sky: '#2b2820', horizon: '#d3b07c', light: '#f3ddb4', ground: '#221e17', line: 0.66, form: 'columns' },
}

/** Foreground shapes, drawn near-black against the light. y is the horizon. */
const FORM = (name, y) =>
  ({
    parasols: `<path d="M180 ${y} q0 -70 90 -70 q90 0 90 70z" /><rect x="266" y="${y}" width="7" height="${800 - y}"/>
               <path d="M840 ${y + 30} q0 -58 74 -58 q74 0 74 58z"/><rect x="910" y="${y + 30}" width="6" height="${770 - y}"/>`,
    arch: `<path fill-rule="evenodd" d="M0 800 V${y - 90} H1200 V800 Z
             M430 800 V${y + 30} q170 -190 340 0 V800 Z"/>`,
    crowd: `<path d="M0 800 V${y + 120} q40 -46 80 0 q44 -60 92 0 q52 -40 96 0 q40 -56 88 0 q48 -44 96 0
             q44 -58 92 0 q50 -42 96 0 q42 -54 90 0 q46 -46 94 0 q40 -50 86 0 q42 -40 90 0 V800 Z"/>`,
    glasses: `<path d="M300 ${y} h120 l-20 90 v70 h30 v14 h-120 v-14h30 v-70z"/>
              <path d="M820 ${y - 30} h70 v40 l24 60 v${800 - y - 40} h-118 v-${800 - y - 40} l24 -60z"/>`,
    hull: `<path d="M180 ${y + 46} h700 l-96 74 H262z"/><rect x="520" y="${y - 210}" width="8" height="256"/>
           <path d="M536 ${y - 200} L660 ${y + 40} H536z"/>`,
    wake: `<path d="M0 ${y + 70} q220 -46 440 0 t440 0 t320 0" fill="none" stroke="#0b0a09" stroke-width="16"/>
           <path d="M0 ${y + 140} q260 -54 520 0 t520 0" fill="none" stroke="#0b0a09" stroke-width="20"/>`,
    ridge: `<path d="M0 ${y + 40} L300 ${y - 60} L560 ${y + 30} L860 ${y - 40} L1200 ${y + 60} V800 H0z"/>`,
    coast: `<path d="M0 ${y + 30} q200 -50 420 -14 q260 42 480 -20 q160 -44 300 4 V800 H0z"/>`,
    cypress: `<path d="M240 800 q-26 -150 26 -240 q52 90 26 240z"/><path d="M330 800 q-20 -120 20 -190 q40 70 20 190z"/>
              <rect x="520" y="${y + 90}" width="620" height="${710 - y}" rx="6"/>`,
    leaves: `<path d="M240 800 q-40 -190 120 -280 q40 200 -120 280z"/><path d="M980 800 q40 -170 -110 -250 q-36 180 110 250z"/>`,
    table: `<rect x="150" y="${y + 96}" width="900" height="18" rx="6"/><rect x="230" y="${y + 114}" width="14" height="${686 - y}"/>
            <rect x="956" y="${y + 114}" width="14" height="${686 - y}"/>
            <path d="M600 ${y + 96} v-70 h44 v70z"/><path d="M614 ${y + 26} q8 -34 16 0z"/>`,
    columns: `<rect x="120" y="${y - 260}" width="360" height="40"/>
              <rect x="150" y="${y - 220}" width="44" height="${820 - y}"/>
              <rect x="252" y="${y - 220}" width="44" height="${820 - y}"/>
              <rect x="354" y="${y - 220}" width="44" height="${820 - y}"/>`,
  })[name] ?? ''

function seedOf(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/**
 * Heights match the aspect each picture is displayed at, so object-cover
 * never crops the silhouettes off the bottom of the frame.
 */
const ENTRY_HEIGHT = 525        // aspect-[16/7] in PlanItem
const DESTINATION_HEIGHT = 450  // aspect-[16/6] in ChoiceCard
const HERO_HEIGHT = 500         // aspect-[12/5] in Start

function plate(scene, seed, height) {
  const y = Math.round(height * scene.line)
  const sunX = 22 + (seed % 58)
  const sunR = 90 + (seed % 60)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 ${height}" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${scene.sky}"/>
<stop offset=".62" stop-color="${scene.sky}" stop-opacity=".55"/>
<stop offset="1" stop-color="${scene.horizon}"/>
</linearGradient>
<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${scene.horizon}" stop-opacity=".85"/>
<stop offset=".35" stop-color="${scene.ground}"/>
<stop offset="1" stop-color="#0b0a09"/>
</linearGradient>
<radialGradient id="sun" cx="50%" cy="50%" r="50%">
<stop offset="0" stop-color="${scene.light}"/>
<stop offset=".45" stop-color="${scene.light}" stop-opacity=".45"/>
<stop offset="1" stop-color="${scene.light}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="vig" cx="50%" cy="46%" r="72%">
<stop offset=".55" stop-color="#0b0a09" stop-opacity="0"/>
<stop offset="1" stop-color="#0b0a09" stop-opacity=".72"/>
</radialGradient>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3"/>
<feColorMatrix type="saturate" values="0"/></filter>
</defs>
<rect width="1200" height="${y}" fill="url(#sky)"/>
<circle cx="${sunX * 12}" cy="${y - 30}" r="${sunR}" fill="url(#sun)"/>
<rect y="${y}" width="1200" height="${height - y}" fill="url(#ground)"/>
<ellipse cx="${sunX * 12}" cy="${y + 10}" rx="${sunR * 0.7}" ry="${sunR * 1.5}" fill="url(#sun)" opacity=".5"/>
<g fill="#0b0a09" fill-opacity=".82">${FORM(scene.form, y)}</g>
<rect width="1200" height="${height}" fill="url(#vig)"/>
<rect width="1200" height="${height}" filter="url(#grain)" opacity=".05"/>
</svg>
`
}

mkdirSync(fileURLToPath(new URL('public/images/', root)), { recursive: true })

let bytes = 0
const write = (path, svg) => {
  bytes += svg.length
  writeFileSync(new URL('public' + path, root), svg)
}

for (const item of inventory.items) {
  write(item.image, plate(SCENE[item.kategorie], seedOf(item.insel + item.name), ENTRY_HEIGHT))
}

// The brief meets a guest before any programme exists, so it gets pictures too.
for (const [slug, form] of [['mykonos', 'parasols'], ['ibiza', 'coast'], ['st-tropez', 'cypress']]) {
  write(`/images/destination-${slug}.svg`, plate({ ...SCENE.beachclub, form }, seedOf(slug), DESTINATION_HEIGHT))
}
write('/images/hero.svg', plate({ ...SCENE.yacht, line: 0.62, form: 'hull' }, seedOf('riviera'), HERO_HEIGHT))

console.log(`${inventory.items.length + 4} plates, ${(bytes / 1024).toFixed(0)} KB total`)
