/*
 * File: BackofficeHome.jsx
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Landing page for Backoffice staff. For now it confirms the login worked and
 *              lists the sections each member will add. The cards become real pages as the
 *              modules are finished.
 */

import { useAuth } from '../context/AuthContext.jsx'

// Sections planned for the Backoffice user, from the marking scheme.
const PLANNED_SECTIONS = [
  { title: 'User management', detail: 'Create Backoffice and Grid Operator users.', owner: 'Member A' },
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

      <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-sm text-emerald-800">
          Connected to the Web API. The token from login is being sent with every request.
        </p>
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Sections to be built
      </h2>

      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLANNED_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{section.detail}</p>
            <span className="mt-3 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {section.owner}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
