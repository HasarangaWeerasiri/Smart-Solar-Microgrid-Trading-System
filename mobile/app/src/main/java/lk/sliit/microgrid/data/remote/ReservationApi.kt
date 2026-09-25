/*
 * File: ReservationApi.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-25
 * Description: Calls for the energy reservation endpoints of the Web API. These only send and
 *              receive data. The 7 day rule, the 12 hour rule, double booking and "own bookings
 *              only" are all decided by the API; its message is shown to the user as it is.
 */

package lk.sliit.microgrid.data.remote

import lk.sliit.microgrid.data.model.Reservation
import org.json.JSONObject

/**
 * Reservation calls used by the prosumer booking screens.
 */
object ReservationApi {

    /**
     * Books a slot for the logged-in prosumer (POST /api/reservations). Only the slot id is
     * sent: the API takes the NIC from the token and the date/time from the slot.
     */
    fun create(slotId: String, token: String): Reservation {
        val body = JSONObject().put("slotId", slotId)
        val response = ApiClient.request("/api/reservations", method = "POST", body = body, token = token)
        return parse(response)
    }

    /**
     * Lists the logged-in prosumer's own reservations (GET /api/reservations). The API only
     * ever returns the caller's own bookings, whatever the app asks for.
     */
    fun listMine(token: String): List<Reservation> {
        val array = ApiClient.requestArray("/api/reservations", token = token)
        return (0 until array.length()).map { index -> parse(array.getJSONObject(index)) }
    }

    /**
     * Reads one reservation fresh from the API (GET /api/reservations/{id}), so its status and
     * canModify flag are up to date.
     */
    fun get(id: String, token: String): Reservation {
        return parse(ApiClient.request("/api/reservations/$id", token = token))
    }

    /**
     * Moves a reservation to another slot (PUT /api/reservations/{id}). The API checks the
     * 12 hour rule on the current slot and the 7 day rule on the new one, and sends the
     * booking back to Pending.
     */
    fun update(id: String, slotId: String, token: String): Reservation {
        val body = JSONObject().put("slotId", slotId)
        return parse(ApiClient.request("/api/reservations/$id", method = "PUT", body = body, token = token))
    }

    /**
     * Cancels a reservation. The API checks the 12 hour rule. POST is used because Android's
     * HttpURLConnection cannot send PATCH; the API accepts both on this route.
     */
    fun cancel(id: String, token: String): Reservation {
        return parse(ApiClient.request("/api/reservations/$id/cancel", method = "POST", token = token))
    }

    /**
     * Turns one reservation JSON object from the API into a Reservation.
     * Also used by the summary screen, which receives the reservation as JSON text.
     */
    fun parse(json: JSONObject): Reservation {
        return Reservation(
            id = json.getString("id"),
            prosumerNic = json.optString("prosumerNic"),
            prosumerName = readOptional(json, "prosumerName"),
            stationId = json.optString("stationId"),
            stationName = readOptional(json, "stationName"),
            slotId = json.optString("slotId"),
            slotName = readOptional(json, "slotName"),
            reservationStart = json.getString("reservationStart"),
            reservationEnd = json.getString("reservationEnd"),
            status = json.getString("status"),
            canModify = json.optBoolean("canModify"),
            createdAt = json.optString("createdAt"),
            updatedAt = json.optString("updatedAt")
        )
    }

    /**
     * Reads a field the API may send as null, returning a real null instead of the text "null".
     */
    private fun readOptional(json: JSONObject, name: String): String? {
        if (json.isNull(name)) {
            return null
        }
        return json.optString(name).takeIf { it.isNotBlank() }
    }
}
