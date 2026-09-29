/*
 * File: QrToken.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Member D
 * Created: 2026-09-28
 * Description: The signed QR token for one reservation, as GET /api/reservations/{id}/qr
 *              returns it. The server issues and signs the token; this app only ever draws it
 *              as a QR code and never builds or signs one itself.
 */

package lk.sliit.microgrid.data.model

/**
 * A time-limited token a prosumer's app shows as a QR code at the station.
 */
data class QrToken(
    val token: String,
    val reservationId: String,
    val expiresAt: String
)
