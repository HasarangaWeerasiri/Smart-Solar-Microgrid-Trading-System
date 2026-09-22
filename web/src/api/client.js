/*
 * File: client.js
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: The single place where the web client talks to the C# Web API. Every page
 *              calls the API through here, so the base address, the auth token and the
 *              error handling are written once. The web app never touches MongoDB.
 */

// The address of the API. Read from .env so it can point at localhost during development
// and at the IIS server after deployment, without changing any code.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5288'

// Key used to keep the login token in the browser between page refreshes.
const TOKEN_KEY = 'microgrid.token'

/**
 * Error thrown when the API answers with a failure. Carries the HTTP status so a page
 * can tell the difference between 401 (not logged in) and 403 (not allowed).
 */
export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

/**
 * Reads the saved login token, or null when nobody is logged in.
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Saves the login token so the session survives a page refresh.
 */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * Removes the saved token. Used on logout and when a token is rejected.
 */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Turns whatever the API sent back into a message a user can read.
 * Handles our own { error: "..." } shape and ASP.NET's validation problem details.
 */
function readErrorMessage(data, status) {
  if (data && typeof data.error === 'string') {
    return data.error
  }

  // ASP.NET model validation returns { errors: { Field: ["message"] } }.
  if (data && data.errors && typeof data.errors === 'object') {
    const messages = Object.values(data.errors).flat()
    if (messages.length > 0) {
      return messages.join(' ')
    }
  }

  if (data && typeof data.title === 'string') {
    return data.title
  }

  return `Request failed with status ${status}.`
}

/**
 * Parses a JSON string and returns null instead of throwing when the body is not JSON.
 */
function safeParseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Sends one request to the API and returns the parsed body.
 * Adds the JSON content type and the bearer token automatically, and throws an
 * ApiError when the API answers with a failure status.
 */
export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, auth = true } = options

  const headers = {}
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const token = getToken()
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    })
  } catch {
    // fetch only rejects when the server could not be reached at all.
    throw new ApiError(
      'Cannot reach the server. Check that the API is running and that VITE_API_BASE_URL is correct.',
      0
    )
  }

  // 204 No Content has no body to read.
  if (response.status === 204) {
    return null
  }

  const text = await response.text()
  const data = text ? safeParseJson(text) : null

  if (!response.ok) {
    throw new ApiError(readErrorMessage(data, response.status), response.status, data)
  }

  return data
}
