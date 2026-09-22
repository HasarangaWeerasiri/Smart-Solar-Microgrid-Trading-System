/*
 * File: Layout.jsx
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Shared frame around every signed-in page. Shows the app name, the links for
 *              the current role, the signed-in user and the logout button.
 */

import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ROLES } from '../roles.js'

/**
 * Returns the navigation links a role is allowed to see.
 * More links are added here as each member finishes their module.
 */
function linksForRole(role) {
  if (role === ROLES.BACKOFFICE) {
    return [{ to: '/backoffice', label: 'Dashboard' }]
  }

  if (role === ROLES.GRID_OPERATOR) {
    return [{ to: '/operator', label: 'Dashboard' }]
  }

  return []
}

/**
 * Draws the header and then the current page underneath it.
 */
export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  /**
   * Logs the user out and returns to the login page.
   */
  function handleLogout() {
    signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-lg">
              &#9728;
            </span>
            <span className="text-base font-semibold text-slate-900">Smart Solar Microgrid</span>
          </div>

          <nav className="flex items-center gap-1">
            {linksForRole(user?.role).map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{user?.fullName}</p>
              <p className="text-xs text-slate-500">{user?.role}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
