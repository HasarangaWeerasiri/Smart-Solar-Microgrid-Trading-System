/*
 * File: SlotApi.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-25
 * Description: Reads a station's energy booking slots from the Web API, so a prosumer can pick
 *              one to reserve. Read only: slots are created and managed on the web.
 */

package lk.sliit.microgrid.data.remote

import lk.sliit.microgrid.data.model.EnergySlot
import org.json.JSONArray

/**
 * Slot calls used by the booking screens.
 */
object SlotApi {

    /**
     * Returns every slot of one station (GET /api/stations/{id}/slots), in the API's order.
     */
    fun getSlotsByStation(stationId: String, token: String): List<EnergySlot> {
        val array = ApiClient.requestArray("/api/stations/$stationId/slots", token = token)
        return parseSlots(array)
    }

    /**
     * Turns the API's JSON array into EnergySlot objects.
     */
    private fun parseSlots(array: JSONArray): List<EnergySlot> {
        val slots = mutableListOf<EnergySlot>()

        for (index in 0 until array.length()) {
            val json = array.getJSONObject(index)
            slots.add(
                EnergySlot(
                    id = json.getString("id"),
                    stationId = json.getString("stationId"),
                    slotName = json.optString("slotName"),
                    startTime = json.getString("startTime"),
                    endTime = json.getString("endTime"),
                    isAvailable = json.optBoolean("isAvailable"),
                    status = json.optString("status")
                )
            )
        }

        return slots
    }
}
