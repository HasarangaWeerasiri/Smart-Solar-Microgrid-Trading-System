/*
 * File: prosumers.js
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-23
 * Description: Calls for the prosumer endpoints (/api/prosumers). The NIC is the account id,
 *              so it appears in the route. These only send and receive data - the API decides
 *              who may do what, and whether a new account starts Pending or Active.
 */

import { apiRequest } from './client.js'

/**
 * Lists prosumers. Pass a status to filter, for example "Pending" for the approvals page.
 */
export function listProsumers({ status = '' } = {}) {
  const suffix = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiRequest(`/api/prosumers${suffix}`)
}

/**
 * Returns one prosumer profile by NIC.
 */
export function getProsumer(nic) {
  return apiRequest(`/api/prosumers/${encodeURIComponent(nic)}`)
}

/**
 * Registers a prosumer. Called here with a Backoffice token, so the API creates the
 * account as Active rather than Pending.
 */
export function registerProsumer(prosumer) {
  return apiRequest('/api/prosumers', { method: 'POST', body: prosumer })
}

/**
 * Updates a prosumer profile. The NIC is not part of the body and can never change.
 */
export function updateProsumer(nic, prosumer) {
  return apiRequest(`/api/prosumers/${encodeURIComponent(nic)}`, { method: 'PUT', body: prosumer })
}

/**
 * Deactivates a prosumer account so it can no longer log in.
 */
export function deactivateProsumer(nic) {
  return apiRequest(`/api/prosumers/${encodeURIComponent(nic)}/deactivate`, { method: 'PATCH' })
}

/**
 * Approves a pending registration, or reactivates a deactivated account.
 * The API allows this for Backoffice only.
 */
export function activateProsumer(nic) {
  return apiRequest(`/api/prosumers/${encodeURIComponent(nic)}/activate`, { method: 'PATCH' })
}
