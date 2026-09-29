/*
 * File: users.js
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-23
 * Description: Calls for the staff user endpoints (/api/users). These only send and receive
 *              data - every rule about who may do what is decided by the API, which allows
 *              these endpoints for Backoffice users only.
 */

import { apiRequest } from './client.js'

/**
 * Lists staff users. Pass role and status to filter; leave them empty for all.
 */
export function listUsers({ role = '', status = '' } = {}) {
  const query = new URLSearchParams()
  if (role) query.set('role', role)
  if (status) query.set('status', status)

  const suffix = query.toString() ? `?${query.toString()}` : ''
  return apiRequest(`/api/users${suffix}`)
}

/**
 * Creates a Backoffice or Grid Operator account.
 */
export function createUser(user) {
  return apiRequest('/api/users', { method: 'POST', body: user })
}

/**
 * Updates a staff account. Leave newPassword empty to keep the current password.
 */
export function updateUser(id, user) {
  return apiRequest(`/api/users/${encodeURIComponent(id)}`, { method: 'PUT', body: user })
}

/**
 * Deactivates a staff account so it can no longer log in.
 */
export function deactivateUser(id) {
  return apiRequest(`/api/users/${encodeURIComponent(id)}/deactivate`, { method: 'PATCH' })
}

/**
 * Reactivates a deactivated staff account.
 */
export function activateUser(id) {
  return apiRequest(`/api/users/${encodeURIComponent(id)}/activate`, { method: 'PATCH' })
}
