/*
 * File: roles.js
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Role names and the home page each role lands on after login. The spelling
 *              matches the Roles class in the API so the two never drift apart.
 */

export const ROLES = {
  BACKOFFICE: 'Backoffice',
  GRID_OPERATOR: 'GridOperator',
  PROSUMER: 'Prosumer'
}

/**
 * Returns the page a role should be sent to after logging in.
 * Prosumers have no web pages - they use the Android app - so they get null.
 */
export function homePathForRole(role) {
  if (role === ROLES.BACKOFFICE) {
    return '/backoffice'
  }

  if (role === ROLES.GRID_OPERATOR) {
    return '/operator'
  }

  return null
}
