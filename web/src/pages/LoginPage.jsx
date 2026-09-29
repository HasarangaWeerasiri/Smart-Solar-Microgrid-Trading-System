/*
 * File: LoginPage.jsx
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Login screen for Backoffice and Grid Operator staff. Sends the details to
 *              the API and sends the user to the home page for their role. Prosumers are
 *              turned away here because they use the Android app.
 */

import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { homePathForRole } from '../roles.js'

/**
 * Draws the login form and handles the sign in attempt.
 */
export default function LoginPage() {
  const { user, isRestoring, signIn, signOut } = useAuth()
  const navigate = useNavigate()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Somebody already logged in should not see the login form again.
  if (!isRestoring && user) {
    const home = homePathForRole(user.role)
    if (home) {
      return <Navigate to={home} replace />
    }
  }

  /**
   * Sends the form to the API, then routes the user by role or shows the error.
   */
  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const signedInUser = await signIn(identifier.trim(), password)
      const home = homePathForRole(signedInUser.role)

      // A prosumer has no pages in the web app, so the session is dropped again.
      if (!home) {
        signOut()
        setErrorMessage('Prosumer accounts use the mobile app. This site is for staff only.')
        return
      }

      navigate(home, { replace: true })
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-amber-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 text-2xl">
            &#9728;
          </span>
          <h1 className="text-xl font-semibold text-slate-900">Smart Solar Microgrid</h1>
          <p className="mt-1 text-sm text-slate-500">Backoffice and Grid Operator sign in</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="username"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              placeholder="admin@microgrid.lk"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              placeholder="Your password"
            />
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
