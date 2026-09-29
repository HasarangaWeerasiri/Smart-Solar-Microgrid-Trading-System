/*
 * File: VerifiedBooking.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Member D
 * Created: 2026-09-28
 * Description: What a Grid Operator's screen shows after a scanned QR code is verified, as
 *              POST /api/reservations/verify-qr returns it. Verifying is read-only and never
 *              changes the reservation - only a separate call to /complete does that.
 */

package lk.sliit.microgrid.data.model

/**
 * The booking a verified QR token belongs to, shown to the operator before they confirm the
 * transfer is complete.
 */
data class VerifiedBooking(
    val reservationId: String,
    val prosumerNic: String,
    val prosumerFullName: String?,
    val stationName: String?,
    val slotName: String?,
    val startTime: String,
    val endTime: String,
    val status: String
)
