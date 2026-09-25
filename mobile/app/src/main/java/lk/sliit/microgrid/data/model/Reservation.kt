/*
 * File: Reservation.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-25
 * Description: One energy slot reservation as the API returns it. Times stay as the API's UTC
 *              text and are only turned into local time for display. canModify comes from the
 *              API, so the app never works out the 12 hour rule itself. Serializable so a
 *              booking can be handed from one screen to the next (for the summary screen).
 */

package lk.sliit.microgrid.data.model

import java.io.Serializable

/**
 * An energy slot booking.
 */
data class Reservation(
    val id: String,
    val prosumerNic: String,
    val prosumerName: String?,
    val stationId: String,
    val stationName: String?,
    val slotId: String,
    val slotName: String?,
    val reservationStart: String,
    val reservationEnd: String,
    val status: String,
    val canModify: Boolean,
    val createdAt: String,
    val updatedAt: String
) : Serializable
