/*
 * File: OperatorHome.jsx
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Landing page for Grid Operators. Operators run the day to day jobs: slot
 *              availability and watching bookings. Admin sections are not shown here, and
 *              the API refuses them as well.
 */

import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Sections for the Grid Operator, from the marking scheme.
// A section with a "to" is built and opens its page; one without is still being worked on.
const PLANNED_SECTIONS = [
  { title: 'Battery slot availability', detail: 'Update the slots open at each station.', owner: 'Member B' },
  { title: 'Booking monitor', detail: 'Watch, approve and cancel power trading bookings.', owner: 'Member C', to: '/operator/reservations' },
  { title: 'Reservation dashboard', detail: 'Pending reservations and approved future counts.', owner: 'Member D' }
]

/**
 * Draws the Grid Operator landing page.
 */
export default function OperatorHome() {
  const { user } = useAuth()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Grid Operator dashboard</h1>
      <p className="mt-1 text-sm text-slate-600">
        Signed in as {user?.fullName} ({user?.email}).
      </p>

      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm text-amber-800">
          Operator access. Admin functions such as user management are blocked for this role
          by the API, not just hidden here.
        </p>
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Sections
      </h2>

      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLANNED_SECTIONS.map((section) => {
          const card = (
            <>
              <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{section.detail}</p>
              <span
                className={`mt-3 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  section.to ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {section.to ? 'Open' : section.owner}
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
