/*
 * File: Layout.jsx
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Shared frame around every signed-in page. A side navigation bar holds the
 *              app name, the links for the current role, and the signed-in user with a
 *              logout button. On small screens the sidebar slides in from a menu button.
 */

import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ROLES } from '../roles.js'

/**
 * Returns the navigation links a role is allowed to see.
 * More links are added here as each member finishes their module.
 */
function linksForRole(role) {
  if (role === ROLES.BACKOFFICE) {
    return [
      { to: '/backoffice', label: 'Dashboard', end: true },
      { to: '/backoffice/users', label: 'Users' },
      { to: '/backoffice/pending', label: 'Pending activations' },
      { to: '/backoffice/prosumers', label: 'Prosumers' }
    ]
  }

  if (role === ROLES.GRID_OPERATOR) {
    return [{ to: '/operator', label: 'Dashboard', end: true }]
  }

  return []
}

/**
 * Draws the sidebar and the current page beside it.
 */
export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  /**
   * Logs the user out and returns to the login page.
   */
  function handleLogout() {
    signOut()
    navigate('/login', { replace: true })
  }

  const links = linksForRole(user?.role)

  return (
    <div className="flex min-h-full bg-slate-50">
      {/* Dark background behind the sliding menu on small screens. */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 transition-transform duration-200 md:static md:translate-x-0 ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-lg">
            &#9728;
          </span>
          <span className="text-sm font-semibold leading-tight text-white">
            Smart Solar
            <br />
            Microgrid
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setIsMenuOpen(false)}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Signed-in user and logout, pinned to the bottom of the sidebar. */}
        <div className="border-t border-slate-800 px-5 py-4">
          <p className="truncate text-sm font-medium text-white">{user?.fullName}</p>
          <p className="text-xs text-slate-400">{user?.role}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 w-full rounded-md border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Menu button, only needed when the sidebar is hidden on small screens. */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open menu"
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            &#9776;
          </button>
          <span className="text-sm font-semibold text-slate-900">Smart Solar Microgrid</span>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
