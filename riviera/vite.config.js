import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Runs api/itinerary.js inside the dev server so `npm run dev` behaves like
 * production. The API key is read by this Node process from .env.local and
 * never reaches the browser — it is deliberately not a VITE_ variable.
 */
function itineraryDevApi() {
  return {
    name: 'riviera-itinerary-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/itinerary', async (req, res) => {
        const send = (status, payload) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(payload))
        }

        if (req.method !== 'POST') {
          send(405, { error: 'Use POST.' })
          return
        }

        try {
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          req.body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
        } catch {
          send(400, { error: 'Body must be JSON.' })
          return
        }

        // Imported per request so edits to the handler take effect without a restart.
        const modulePath = path.resolve(process.cwd(), 'api/itinerary.js')
        const { default: handler } = await import(`${pathToFileURL(modulePath).href}?t=${Date.now()}`)

        await handler(req, {
          status: (code) => ({ json: (payload) => send(code, payload) }),
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), itineraryDevApi()],
})
