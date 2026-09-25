/*
 * File: reservations.js
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-25
 * Description: Calls for the energy reservation endpoints (/api/reservations). These only send
 *              and receive data. The 7 day rule, the 12 hour rule, double booking and who may
 *              approve are all decided by the API, never here.
 */

import { apiRequest } from './client.js'

/**
 * Lists reservations, latest reservation time first. Optional filters: status, stationId, nic.
 */
export function listReservations({ status = '', stationId = '', nic = '' } = {}) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (stationId) params.set('stationId', stationId)
  if (nic) params.set('nic', nic)

  const query = params.toString()
  return apiRequest(`/api/reservations${query ? `?${query}` : ''}`)
}

/**
 * Returns one reservation by id.
 */
export function getReservation(id) {
  return apiRequest(`/api/reservations/${encodeURIComponent(id)}`)
}

/**
 * Books a slot for the prosumer with the given NIC. Staff must send the NIC.
 */
export function createReservation({ nic, slotId }) {
  return apiRequest('/api/reservations', { method: 'POST', body: { nic, slotId } })
}

/**
 * Moves a reservation to another slot. The API sends it back to Pending for re-approval.
 */
export function updateReservation(id, { slotId }) {
  return apiRequest(`/api/reservations/${encodeURIComponent(id)}`, { method: 'PUT', body: { slotId } })
}

/**
 * Cancels a reservation. The API refuses it with less than 12 hours' notice.
 */
export function cancelReservation(id) {
  return apiRequest(`/api/reservations/${encodeURIComponent(id)}/cancel`, { method: 'PATCH' })
}

/**
 * Approves a Pending reservation. Backoffice and Grid Operator only.
 */
export function approveReservation(id) {
  return apiRequest(`/api/reservations/${encodeURIComponent(id)}/approve`, { method: 'PATCH' })
}
