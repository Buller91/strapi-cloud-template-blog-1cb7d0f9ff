import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Start from './pages/Start.jsx'
import Itinerary from './pages/Itinerary.jsx'
import Request from './pages/Request.jsx'
import Admin from './pages/Admin.jsx'
import { guestLanguage } from './lib/itinerary.js'
import { saveRequest } from './lib/requests.js'

/** Brief -> programme -> request. One flow, held in state rather than routed. */
function Guest() {
  const [brief, setBrief] = useState(null)
  const [request, setRequest] = useState(null)
  const locale = guestLanguage()

  // Written here, on the click, rather than in an effect on the request
  // screen — an effect would file the request twice under StrictMode.
  const file = (entries, total) => setRequest(saveRequest({ brief, entries, total }))

  if (request) {
    return (
      <Request
        record={request.record}
        stored={request.stored}
        locale={locale}
        onBack={() => setRequest(null)}
      />
    )
  }

  if (brief) {
    return <Itinerary brief={brief} onEdit={() => setBrief(null)} onRequest={file} />
  }

  return <Start onSubmit={setBrief} />
}

function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 sm:px-10">
      <p className="eyebrow text-gold">Nothing here</p>
      <h1 className="font-display text-[2.5rem] font-light mt-8 sm:text-5xl">
        This page does not exist.
      </h1>
      <Link
        to="/"
        className="inline-block self-start eyebrow text-muted mt-12 border-b border-line pb-2
                   transition-colors duration-300 hover:text-bone hover:border-gold/50"
      >
        Back to the start
      </Link>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Guest />} />
        <Route path="/admin" element={<Admin locale={guestLanguage()} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
