import { useState } from 'react'
import Start from './pages/Start.jsx'
import Itinerary from './pages/Itinerary.jsx'
import Request from './pages/Request.jsx'
import { guestLanguage } from './lib/itinerary.js'

export default function App() {
  const [brief, setBrief] = useState(null)
  const [request, setRequest] = useState(null)

  if (request) {
    return (
      <Request
        entries={request.entries}
        total={request.total}
        locale={guestLanguage()}
        onBack={() => setRequest(null)}
      />
    )
  }

  if (brief) {
    return (
      <Itinerary
        brief={brief}
        onEdit={() => setBrief(null)}
        onRequest={(entries, total) => setRequest({ entries, total })}
      />
    )
  }

  return <Start onSubmit={setBrief} />
}
