import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-sonnet-4-6'

const DESTINATIONS = { mykonos: 'Mykonos', ibiza: 'Ibiza', 'st-tropez': 'St. Tropez' }
const BUDGETS = {
  standard: 'Standard — considered choices, not the most expensive room in town.',
  vip: 'VIP — front row throughout: the best beds, table service, private transfers.',
  'no-limit': 'No Limit — nothing ruled out on price.',
}
const CATEGORIES = ['beachclub', 'restaurant', 'club', 'yacht', 'transfer', 'villa']

const inventory = JSON.parse(
  readFileSync(fileURLToPath(new URL('../src/data/inventory.json', import.meta.url)), 'utf8'),
)

/** The shape the model must return. Enforced by the API, not by the prompt. */
const SCHEMA = {
  type: 'object',
  properties: {
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                time: { type: 'string', description: 'Start time as HH:MM, 24-hour.' },
                name: { type: 'string', description: 'Copied verbatim from the inventory entry.' },
                kategorie: { type: 'string', enum: CATEGORIES },
                why: { type: 'string', description: 'One sentence on why this fits these guests.' },
                price_estimate: { type: 'string', description: 'Copied verbatim from the inventory entry.' },
              },
              required: ['time', 'name', 'kategorie', 'why', 'price_estimate'],
              additionalProperties: false,
            },
          },
        },
        required: ['date', 'items'],
        additionalProperties: false,
      },
    },
  },
  required: ['days'],
  additionalProperties: false,
}

/** Every calendar day of the stay, arrival and departure included. */
function tripDays(arrival, departure) {
  const days = []
  for (let d = new Date(arrival); d <= new Date(departure); d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

/** Rejects anything the form could not have produced — this endpoint costs money to call. */
export function validateBrief(brief) {
  const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))

  if (!brief || typeof brief !== 'object') return 'Malformed body.'
  if (!DESTINATIONS[brief.destination]) return 'Unknown destination.'
  if (!BUDGETS[brief.budget]) return 'Unknown budget level.'
  if (!isDate(brief.arrival) || !isDate(brief.departure)) return 'Dates must be ISO calendar dates.'
  if (brief.departure <= brief.arrival) return 'Departure must fall after arrival.'
  if (!Number.isInteger(brief.guests) || brief.guests < 1 || brief.guests > 24) return 'Guests must be 1–24.'
  if (tripDays(brief.arrival, brief.departure).length > 21) return 'Stays longer than 21 days are not planned automatically.'
  if (brief.language !== undefined && !/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/.test(brief.language)) {
    return 'Malformed language tag.'
  }
  return null
}

function buildPrompt(brief) {
  const days = tripDays(brief.arrival, brief.departure)
  const venues = inventory.items.filter((item) => item.insel === DESTINATIONS[brief.destination])
  const language = new Intl.DisplayNames(['en'], { type: 'language' }).of(brief.language || 'en')

  const system = [
    'You are the head concierge at Riviera, a private travel desk for Mykonos, Ibiza and St. Tropez.',
    'You compose a day-by-day programme from a fixed inventory of venues.',
    '',
    'Rules:',
    `- Use only venues from the inventory given below. Never invent a venue, and copy "name" and "price_estimate" verbatim from the inventory entry — those prices are the desk's own estimates and must not be altered.`,
    '- 3 to 4 entries per day. Order every day chronologically.',
    '- Keep the timing realistic: beach and water during the day, dinner around 21:00, clubs from 00:00 onwards. Respect each entry\'s best_time window.',
    '- Never schedule two entries that overlap in time.',
    '- The first day is an arrival day: start it later and open it with the transfer. The last day is a departure day: nothing after midday, and no nightlife.',
    '- Do not repeat a venue across the stay unless the stay is long enough that a return visit is genuinely the best choice.',
    `- Weight the selection towards the guests' level, but the level is a tone, not a hard filter.`,
    `- Write every "why" in ${language}, addressed to the guest, one sentence, concrete. Leave venue names and price estimates untranslated.`,
  ].join('\n')

  const user = [
    'Guests: ' + brief.guests,
    'Destination: ' + DESTINATIONS[brief.destination],
    'Level: ' + BUDGETS[brief.budget],
    'Days to plan, in order: ' + days.join(', '),
    '',
    'Inventory:',
    JSON.stringify(venues, null, 1),
  ].join('\n')

  return { system, user, days }
}

/**
 * Calls Claude and returns the parsed plan. Throws on API failure so the
 * caller can map it to a status code.
 */
export async function generateItinerary(brief, client = new Anthropic()) {
  const { system, user } = buildPrompt(brief)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system,
    messages: [{ role: 'user', content: user }],
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
  })

  if (response.stop_reason === 'refusal') {
    throw Object.assign(new Error('The desk could not compose a programme for this brief.'), { status: 422, expose: true })
  }

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')

  return { plan: JSON.parse(text), usage: response.usage }
}

/** Vercel-style handler. The same module backs the Vite dev middleware. */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' })
    return
  }

  const problem = validateBrief(req.body)
  if (problem) {
    res.status(400).json({ error: problem })
    return
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set — see .env.example.')
    res.status(500).json({ error: 'The concierge desk is not configured correctly.' })
    return
  }

  try {
    const { plan } = await generateItinerary(req.body)
    res.status(200).json(plan)
  } catch (error) {
    console.error('Itinerary generation failed:', error)
    res.status(statusFor(error)).json({ error: messageFor(error) })
  }
}

export function statusFor(error) {
  if (error instanceof Anthropic.AuthenticationError) return 500
  if (error instanceof Anthropic.RateLimitError) return 429
  if (error instanceof Anthropic.APIConnectionError) return 503
  if (error instanceof Anthropic.APIError) return error.status >= 500 ? 502 : 400
  return error.status || 500
}

/**
 * Only messages we wrote ourselves reach the browser. Anything else — SDK
 * internals, stack traces, provider detail — stays in the server log.
 */
export function messageFor(error) {
  if (error instanceof Anthropic.AuthenticationError) return 'The concierge desk is not configured correctly.'
  if (error instanceof Anthropic.RateLimitError) return 'The desk is busy. Please try again in a moment.'
  if (error instanceof Anthropic.APIConnectionError) return 'Could not reach the desk. Please try again.'
  if (error.expose) return error.message
  return 'The desk could not put your programme together. Please try again.'
}
