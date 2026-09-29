/*
 * File: ProtectedRoute.jsx
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Wraps pages that need a login. Sends visitors who are not logged in to the
 *              login page, and shows a clear message when the role is wrong.
 *
 *              This is only for tidy navigation. The real protection is on the API, where
 *              every endpoint checks the role in the token, so hiding a page here is never
 *              the only thing stopping someone.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

/**
 * Decides whether the pages inside this route may be shown.
 * Pass allowedRoles to limit a section to certain roles.
 */
export default function ProtectedRoute({ allowedRoles }) {
  const { user, isRestoring } = useAuth()
  const location = useLocation()

  // While the saved token is being checked, show nothing rather than flashing the login page.
  if (isRestoring) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">No access</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your role is <span className="font-medium">{user.role}</span>, which is not allowed
            to open this page.
          </p>
        </div>
      </div>
    )
  }

  return <Outlet />
}
