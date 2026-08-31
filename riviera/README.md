# Riviera

A private-concierge planner for Mykonos, Ibiza and St. Tropez. Guests answer
four questions and Claude composes a day-by-day programme from a fixed
inventory of venues.

## Running it

```bash
npm install
cp .env.example .env.local     # then paste a real key into .env.local
npm run dev
```

Without a key the app runs and the form works; requesting a programme returns
"The concierge desk is not configured correctly."

## The one server-side piece

`api/itinerary.js` is the only code that is not a static asset. It holds the
Anthropic API key and calls the Messages API. It has no database and no
state — every request is self-contained.

It exists because a key shipped to the browser is a public key: anyone can
read it out of the bundle and spend against the account. `ANTHROPIC_API_KEY`
is deliberately **not** prefixed with `VITE_`, so Vite will refuse to inline
it into client code.

In development a small Vite plugin (`vite.config.js`) mounts the same module
at `/api/itinerary`, so `npm run dev` behaves like production. On Vercel the
file is picked up as a serverless function with no extra configuration; on
another host, run it behind any Node endpoint that speaks `(req, res)`.

## The desk view

`/admin` lists every request raised **in that browser**: reference, island,
dates, party size, the selected arrangements and the estimated volume, plus a
combined figure across all of them.

It is not a shared inbox. Requests are held in `localStorage`, so a request
made on a guest's phone never reaches the desk's laptop, and clearing site
data erases them. The page says this on itself. A real inbox needs somewhere
to post requests to.

Routing uses real paths, so any host must fall back to `index.html` for
unknown routes; `vercel.json` does that while leaving `/api` alone.

## Editing the inventory

`src/data/inventory.json` holds every bookable venue, twelve per island. The
model may only use what is in that file — it is instructed to copy names and
`price_estimate` verbatim, and the client checks the returned plan against
the inventory and flags anything it does not recognise.

Prices are the desk's own estimates, not quotes. Update `meta.updated` when
you revise them; the date is shown to guests.
