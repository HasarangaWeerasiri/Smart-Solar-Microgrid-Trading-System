/*
 * File: stations.js
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Description: API functions for microgrid station management.
 */

import { apiRequest } from './client'

// Get all stations
export function getStations() {
  return apiRequest('/api/stations')
}

// Get one station by ID
export function getStationById(stationId) {
  return apiRequest(`/api/stations/${stationId}`)
}

// Create a new station
export function createStation(stationData) {
  return apiRequest('/api/stations', {
    method: 'POST',
    body: stationData
  })
}

// Update an existing station
export function updateStation(stationId, stationData) {
  return apiRequest(`/api/stations/${stationId}`, {
    method: 'PUT',
    body: stationData
  })
}

// Deactivate station
export function deactivateStation(stationId) {
  return apiRequest(`/api/stations/${stationId}/deactivate`, {
    method: 'PATCH'
  })
}

// Activate station
export function activateStation(stationId) {
  return apiRequest(`/api/stations/${stationId}/activate`, {
    method: 'PATCH'
  })
}