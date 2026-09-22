/*
 * File: ProsumerProfile.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-23
 * Description: A prosumer's account details as the API returns them. Used by the register
 *              and profile screens. There is no password field, because the API never
 *              sends a password or its hash back to a client.
 */

package lk.sliit.microgrid.data.model

/**
 * One prosumer account. The NIC is also the account id.
 */
data class ProsumerProfile(
    val nic: String,
    val fullName: String,
    val email: String?,
    val phone: String?,
    val address: String?,
    val status: String
)
