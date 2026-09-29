/*
 * File: auth.js
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Calls for the authentication endpoints of the Web API. These only send and
 *              receive data - every rule about who may log in is decided by the API.
 */

import { apiRequest } from './client.js'

/**
 * Sends login details to the API. Staff use their email, prosumers use their NIC.
 * Returns the token and the user details, or throws an ApiError with the reason.
 */
export function login(identifier, password) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: { identifier, password },
    auth: false
  })
}

/**
 * Asks the API who the saved token belongs to. Used to restore a session after a refresh.
 */
export function fetchCurrentUser() {
  return apiRequest('/api/auth/me')
}
