/*
 * File: AuthContext.jsx
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Holds the logged-in user for the whole web app. Keeps the token in the
 *              browser so a refresh does not log the user out, and asks the API who the
 *              token belongs to when the app starts.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchCurrentUser, login as loginRequest } from '../api/auth.js'
import { clearToken, getToken, setToken } from '../api/client.js'

const AuthContext = createContext(null)

/**
 * Makes the current user and the sign in / sign out actions available to every page.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isRestoring, setIsRestoring] = useState(true)

  // On first load, if a token was saved earlier, ask the API who it belongs to.
  // A token that has expired or been rejected is thrown away.
  useEffect(() => {
    async function restoreSession() {
      if (!getToken()) {
        setIsRestoring(false)
        return
      }

      try {
        const currentUser = await fetchCurrentUser()
        setUser(currentUser)
      } catch {
        clearToken()
        setUser(null)
      } finally {
        setIsRestoring(false)
      }
    }

    restoreSession()
  }, [])

  /**
   * Sends the login details to the API, saves the token and remembers the user.
   * Any failure is thrown back to the page so it can show the API's message.
   */
  const signIn = useCallback(async (identifier, password) => {
    const result = await loginRequest(identifier, password)
    setToken(result.token)

    const signedInUser = {
      userId: result.userId,
      fullName: result.fullName,
      email: result.email,
      role: result.role,
      status: result.status
    }

    setUser(signedInUser)
    return signedInUser
  }, [])

  /**
   * Forgets the token and the user, which sends the app back to the login page.
   */
  const signOut = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, isRestoring, signIn, signOut }),
    [user, isRestoring, signIn, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Shortcut so a page can read the current user with one line.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.')
  }
  return context
}
