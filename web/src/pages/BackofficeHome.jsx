/*
 * File: BackofficeHome.jsx
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Landing page for Backoffice staff. Shows a card for each section of the
 *              system. Finished sections link to their page; the rest show who is building
 *              them, so the team can see progress at a glance.
 */

import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Sections of the Backoffice area, from the marking scheme.
// A section with a "to" is built; one without is still being worked on.
const SECTIONS = [
  { title: 'User management', detail: 'Create Backoffice and Grid Operator users.', owner: 'Member A', to: '/backoffice/users' },
  { title: 'Pending activations', detail: 'Approve new prosumer registrations.', owner: 'Member A' },
  { title: 'Prosumer management', detail: 'Edit, deactivate and reactivate prosumers.', owner: 'Member A' },
  { title: 'Microgrid nodes', detail: 'Register hubs with GPS, capacity and slots.', owner: 'Member B' },
  { title: 'Booking slots', detail: 'Manage the battery slots at each station.', owner: 'Member B' },
  { title: 'Reservations', detail: 'Create, update and cancel energy bookings.', owner: 'Member C' }
]

/**
 * Draws the Backoffice landing page.
 */
export default function BackofficeHome() {
  const { user } = useAuth()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Backoffice dashboard</h1>
      <p className="mt-1 text-sm text-slate-600">
        Signed in as {user?.fullName} ({user?.email}).
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => {
          const card = (
            <>
              <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{section.detail}</p>
              <span
                className={`mt-3 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  section.to ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {section.to ? 'Open' : `${section.owner} - in progress`}
              </span>
            </>
          )

          // A finished section is a link; an unfinished one is just a card.
          return section.to ? (
            <Link
              key={section.title}
              to={section.to}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
            >
              {card}
            </Link>
          ) : (
            <div key={section.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {card}
            </div>
          )
        })}
      </div>
    </div>
  )
}
