/*
 * File: LoggedInUser.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: The signed-in user as the app keeps it: what the API returned at login,
 *              plus the token. This is what gets saved into the local SQLite database.
 */

package lk.sliit.microgrid.data.model

/**
 * One signed-in user. For a prosumer the userId is the NIC.
 */
data class LoggedInUser(
    val userId: String,
    val fullName: String,
    val email: String?,
    val role: String,
    val status: String,
    val token: String
)
