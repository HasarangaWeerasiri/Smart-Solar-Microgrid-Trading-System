/*
 * File: ReservationSummary.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Member D
 * Created: 2026-09-28
 * Description: Reservation counts by status, as GET /api/reservations/summary returns them for
 *              the logged-in prosumer. Serializable so it can be cached and restored the same
 *              way Reservation already is.
 */

package lk.sliit.microgrid.data.model

import java.io.Serializable

/**
 * The four (well, five) counts shown on the prosumer dashboard's summary tiles.
 */
data class ReservationSummary(
    val pending: Int,
    val approved: Int,
    val completed: Int,
    val cancelled: Int,
    val approvedUpcoming: Int
) : Serializable
