/*
 * File: reservations.js
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-25
 * Description: Calls for the energy reservation endpoints (/api/reservations). These only send
 *              and receive data. The 7 day rule, the 12 hour rule, double booking and who may
 *              approve are all decided by the API, never here.
 *              (Dashboard summary, complete, and QR wrappers added by Member D, 2026-09-28.)
 */

import { apiRequest } from './client.js'

/**
 * Lists reservations, latest reservation time first, paged. Optional filters: status,
 * stationId, nic, from/to (ISO 8601, on the slot start time), scope ("current" | "history" |
 * "all") and search (matches prosumer NIC, prosumer name or station name). page and pageSize
 * control paging (defaults 1 and 50, pageSize capped at 200 by the API).
 *
 * The API still returns a plain JSON array for backward compatibility, so the returned value
 * here is still that same array - existing callers that do rows.map(...) or rows.length need
 * no changes. The total count, page and page size (from the X-Total-Count / X-Page /
 * X-Page-Size response headers) are attached as extra properties on that array instead of
 * changing what callers get back, mirroring why the API put them in headers rather than
 * reshaping its own response body.
 */
export async function listReservations({
  status = '', stationId = '', nic = '', from = '', to = '', scope = '', search = '',
  page = 1, pageSize = 50
} = {}) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (stationId) params.set('stationId', stationId)
  if (nic) params.set('nic', nic)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (scope) params.set('scope', scope)
  if (search) params.set('search', search)
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))

  const { data, headers } = await apiRequest(`/api/reservations?${params.toString()}`, { returnHeaders: true })

  const rows = Array.isArray(data) ? data : []
  rows.totalCount = Number(headers.get('X-Total-Count') ?? rows.length)
  rows.page = Number(headers.get('X-Page') ?? page)
  rows.pageSize = Number(headers.get('X-Page-Size') ?? pageSize)
  return rows
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

/**
 * Reservation counts by status, for dashboard tiles. A Backoffice or Grid Operator call gets
 * system-wide counts; there is no prosumer login on the web app.
 */
export function getReservationSummary() {
  return apiRequest('/api/reservations/summary')
}

/**
 * Marks an Approved reservation Completed, once its QR code has been verified.
 * Backoffice and Grid Operator only.
 */
export function completeReservation(id) {
  return apiRequest(`/api/reservations/${encodeURIComponent(id)}/complete`, { method: 'PATCH' })
}

/**
 * Issues a signed QR token for an Approved reservation. The caller must be the reservation's
 * owner or a staff member.
 */
export function getReservationQr(id) {
  return apiRequest(`/api/reservations/${encodeURIComponent(id)}/qr`)
}

/**
 * Verifies a token scanned from a prosumer's QR code and returns the booking it belongs to.
 * Read-only: never changes the reservation's status. Backoffice and Grid Operator only.
 */
export function verifyReservationQr(token) {
  return apiRequest('/api/reservations/verify-qr', { method: 'POST', body: { token } })
}
