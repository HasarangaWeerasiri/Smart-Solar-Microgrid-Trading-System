/*
 * File: Roles.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Role names used by the app. The spelling matches the Roles class in the API
 *              so the two never drift apart.
 */

package lk.sliit.microgrid.data.model

/**
 * Role names stored on a user and sent back by the API at login.
 */
object Roles {
    const val BACKOFFICE = "Backoffice"
    const val GRID_OPERATOR = "GridOperator"
    const val PROSUMER = "Prosumer"
}
