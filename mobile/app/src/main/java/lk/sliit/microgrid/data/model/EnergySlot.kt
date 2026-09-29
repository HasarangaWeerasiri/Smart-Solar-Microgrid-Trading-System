/*
 * File: EnergySlot.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-25
 * Description: One energy booking slot at a station, as the API returns it. A slot is a fixed
 *              date and time window created by Backoffice; booking a slot books that time.
 */

package lk.sliit.microgrid.data.model

/**
 * A bookable time window at a solar station.
 */
data class EnergySlot(
    val id: String,
    val stationId: String,
    val slotName: String,
    val startTime: String,
    val endTime: String,
    val isAvailable: Boolean,
    val status: String
)
