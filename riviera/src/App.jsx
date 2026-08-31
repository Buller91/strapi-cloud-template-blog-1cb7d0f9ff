import { useState } from 'react'
import Start from './pages/Start.jsx'
import Itinerary from './pages/Itinerary.jsx'

export default function App() {
  const [brief, setBrief] = useState(null)

  return brief
    ? <Itinerary brief={brief} onEdit={() => setBrief(null)} />
    : <Start onSubmit={setBrief} />
}
