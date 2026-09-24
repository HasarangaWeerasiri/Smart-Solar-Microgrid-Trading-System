/*
 * File: slots.js
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23218062 - Sanjula Mohotti
 * Description: API functions for battery slot management and availability.
 */

import { apiRequest } from './client'

// Get all slots belonging to a station
export function getSlotsByStation(stationId) {
  return apiRequest(`/api/stations/${stationId}/slots`)
}

// Get one slot
export function getSlotById(slotId) {
  return apiRequest(`/api/slots/${slotId}`)
}

// Create a slot for a station
export function createSlot(stationId, slotData) {
  return apiRequest(`/api/stations/${stationId}/slots`, {
    method: 'POST',
    body: slotData
  })
}

// Update a slot
export function updateSlot(slotId, slotData) {
  return apiRequest(`/api/slots/${slotId}`, {
    method: 'PUT',
    body: slotData
  })
}

// Deactivate a slot
export function deactivateSlot(slotId) {
  return apiRequest(`/api/slots/${slotId}/deactivate`, {
    method: 'PATCH'
  })
}

// Activate a slot
export function activateSlot(slotId) {
  return apiRequest(`/api/slots/${slotId}/activate`, {
    method: 'PATCH'
  })
}

// Grid Operator - change slot availability
export function updateSlotAvailability(slotId, isAvailable) {
  return apiRequest(`/api/slots/${slotId}/availability`, {
    method: 'PATCH',
    body: {
      isAvailable
    }
  })
}