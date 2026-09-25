/*
 * File: BackofficeHome.jsx
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Landing page for Backoffice staff. Shows how many prosumer registrations are
 *              waiting for approval, and a card for each section of the system. Finished
 *              sections link to their page; the rest show who is building them.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listProsumers } from '../api/prosumers.js'
import { useAuth } from '../context/AuthContext.jsx'

// Sections of the Backoffice area, from the marking scheme.
// A section with a "to" is built; one without is still being worked on.
const SECTIONS = [
  { title: 'User management', detail: 'Create Backoffice and Grid Operator users.', owner: 'Member A', to: '/backoffice/users' },
  { title: 'Pending activations', detail: 'Approve new prosumer registrations.', owner: 'Member A', to: '/backoffice/pending' },
  { title: 'Prosumer management', detail: 'Edit, deactivate and reactivate prosumers.', owner: 'Member A', to: '/backoffice/prosumers' },
  { title: 'Microgrid nodes', detail: 'Register hubs with GPS, capacity and slots.', owner: 'Member B' },
  { title: 'Booking slots', detail: 'Manage the battery slots at each station.', owner: 'Member B' },
  { title: 'Reservations', detail: 'Create, update and cancel energy bookings.', owner: 'Member C', to: '/backoffice/reservations' },
  { title: 'Reservation approvals', detail: 'Approve pending energy bookings.', owner: 'Member C', to: '/backoffice/reservations/approvals' }
]

/**
 * Draws the Backoffice landing page.
 */
export default function BackofficeHome() {
  const { user } = useAuth()
  const [pendingCount, setPendingCount] = useState(null)

  // Read the number of waiting registrations live from the API. If the call fails the
  // dashboard still works, it just does not show the count.
  useEffect(() => {
    let isActive = true

    async function loadPendingCount() {
      try {
        const pending = await listProsumers({ status: 'Pending' })
        if (isActive) {
          setPendingCount(pending.length)
        }
      } catch {
        if (isActive) {
          setPendingCount(null)
        }
      }
    }

    loadPendingCount()
    return () => {
      isActive = false
    }
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Backoffice dashboard</h1>
      <p className="mt-1 text-sm text-slate-600">
        Signed in as {user?.fullName} ({user?.email}).
      </p>

      {pendingCount !== null && (
        <Link
          to="/backoffice/pending"
          className={`mt-6 flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
            pendingCount > 0
              ? 'border-amber-200 bg-amber-50 hover:border-amber-300'
              : 'border-emerald-200 bg-emerald-50 hover:border-emerald-300'
          }`}
        >
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-base font-semibold ${
              pendingCount > 0 ? 'bg-amber-400 text-amber-950' : 'bg-emerald-500 text-white'
            }`}
          >
            {pendingCount}
          </span>
          <span className={`text-sm ${pendingCount > 0 ? 'text-amber-900' : 'text-emerald-800'}`}>
            {pendingCount > 0
              ? `${pendingCount} prosumer registration${pendingCount === 1 ? '' : 's'} waiting for approval`
              : 'No registrations waiting for approval'}
          </span>
        </Link>
      )}

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
