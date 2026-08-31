import { useState } from 'react'
import { destinations, budgetTiers, services } from '../data/destinations.js'
import Section from '../components/Section.jsx'
import ChoiceCard from '../components/ChoiceCard.jsx'
import ServiceChip from '../components/ServiceChip.jsx'
import Stepper from '../components/Stepper.jsx'
import DateField from '../components/DateField.jsx'

const today = () => new Date().toISOString().slice(0, 10)

/** Nights between two ISO dates, or null if the range is not usable yet. */
function nights(arrival, departure) {
  if (!arrival || !departure) return null
  const span = (new Date(departure) - new Date(arrival)) / 86_400_000
  return span > 0 ? span : null
}

function validate(brief) {
  const errors = {}
  if (!brief.destination) errors.destination = 'Please choose a destination.'

  if (!brief.arrival || !brief.departure) {
    errors.dates = 'Please give us both dates.'
  } else if (brief.arrival < today()) {
    errors.dates = 'The arrival date has already passed.'
  } else if (brief.departure <= brief.arrival) {
    errors.dates = 'Departure needs to fall after arrival.'
  }

  if (!brief.budget) errors.budget = 'Please choose a level.'
  return errors
}

export default function Start({ onSubmit }) {
  const [brief, setBrief] = useState({
    destination: '',
    arrival: '',
    departure: '',
    guests: 2,
    budget: '',
    interests: [],
  })
  const [showErrors, setShowErrors] = useState(false)

  const set = (patch) => setBrief((prev) => ({ ...prev, ...patch }))

  const errors = validate(brief)
  const visible = showErrors ? errors : {}
  const stay = nights(brief.arrival, brief.departure)

  const toggleService = (id) =>
    set({
      interests: brief.interests.includes(id)
        ? brief.interests.filter((entry) => entry !== id)
        : [...brief.interests, id],
    })

  function handleSubmit(event) {
    event.preventDefault()
    if (Object.keys(errors).length > 0) {
      setShowErrors(true)
      return
    }
    onSubmit(brief)
  }

  return (
    <main className="mx-auto max-w-2xl px-6 pb-32 sm:px-10">
      <header className="pt-14 sm:pt-24">
        <p className="eyebrow text-gold">Riviera</p>

        <h1 className="font-display text-[2.75rem] leading-[1.08] font-light mt-10 sm:text-6xl sm:mt-14">
          Your days, arranged
          <span className="block italic text-bone/70">before you land.</span>
        </h1>

        <p className="text-[0.9375rem] text-muted mt-8 max-w-sm leading-relaxed">
          Four questions. We come back with a private programme for Mykonos,
          Ibiza or St.&nbsp;Tropez — held, not merely suggested.
        </p>
        <img
          src="/images/hero.svg"
          alt=""
          width="1200"
          height="500"
          className="mt-12 block aspect-[12/5] w-full object-cover sm:mt-16"
        />
      </header>

      <form onSubmit={handleSubmit} noValidate className="mt-20 space-y-20 sm:mt-28 sm:space-y-24">
        <Section index="01" title="Where are you going?" error={visible.destination}>
          <div className="space-y-3">
            {destinations.map((d) => (
              <ChoiceCard
                key={d.slug}
                name="destination"
                value={d.slug}
                checked={brief.destination === d.slug}
                onChange={(value) => set({ destination: value })}
                title={d.name}
                image={d.image}
                meta={d.region}
                note={d.note}
              />
            ))}
          </div>
        </Section>

        <Section
          index="02"
          title="When?"
          hint="Arrival and departure. We plan around your flights, not the other way round."
          error={visible.dates}
        >
          <div className="flex flex-col gap-8 sm:flex-row sm:gap-10">
            <DateField
              id="arrival"
              label="Arrival"
              value={brief.arrival}
              min={today()}
              onChange={(value) => set({ arrival: value })}
            />
            <DateField
              id="departure"
              label="Departure"
              value={brief.departure}
              min={brief.arrival || today()}
              onChange={(value) => set({ departure: value })}
            />
          </div>

          {stay && (
            <p className="text-[0.8125rem] text-muted mt-6">
              {stay} {stay === 1 ? 'night' : 'nights'} on the island.
            </p>
          )}
        </Section>

        <Section index="03" title="How many of you?" hint="Including yourself. Children can be noted later.">
          <Stepper label="guest" value={brief.guests} min={1} max={24} onChange={(guests) => set({ guests })} />
        </Section>

        <Section
          index="04"
          title="At what level?"
          hint="This sets the tone of what we propose. Nothing is charged here."
          error={visible.budget}
        >
          <div className="space-y-3">
            {budgetTiers.map((tier) => (
              <ChoiceCard
                key={tier.id}
                name="budget"
                value={tier.id}
                checked={brief.budget === tier.id}
                onChange={(value) => set({ budget: value })}
                title={tier.name}
                note={tier.note}
              />
            ))}
          </div>
        </Section>

        <Section
          index="05"
          title="What do you want to do?"
          hint="Choose as many as you like. Leave it empty and we will propose a full programme."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {services.map((service) => (
              <ServiceChip
                key={service.id}
                name="interests"
                label={service.name}
                checked={brief.interests.includes(service.id)}
                onChange={() => toggleService(service.id)}
              />
            ))}
          </div>

          {brief.interests.length > 0 && (
            <p className="text-[0.8125rem] text-muted mt-6">
              {brief.interests.length} chosen. Everything else stays off the programme.
            </p>
          )}
        </Section>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full border border-gold/50 px-10 py-5 eyebrow text-bone transition-colors duration-300
                       hover:bg-gold hover:text-ink hover:border-gold
                       focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold
                       sm:w-auto"
          >
            Continue
          </button>

          {showErrors && Object.keys(errors).length > 0 && (
            <p role="alert" className="text-[0.8125rem] text-muted mt-5">
              A few answers are still missing above.
            </p>
          )}
        </div>
      </form>
    </main>
  )
}
