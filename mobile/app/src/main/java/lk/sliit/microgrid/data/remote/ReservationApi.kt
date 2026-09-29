/*
 * File: ReservationApi.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-25
 * Description: Calls for the energy reservation endpoints of the Web API. These only send and
 *              receive data. The 7 day rule, the 12 hour rule, double booking and "own bookings
 *              only" are all decided by the API; its message is shown to the user as it is.
 *              (getSummary and list added by Member D, 2026-09-28, for the prosumer dashboard.
 *              Both only ever return the caller's own bookings - the API scopes a Prosumer
 *              token to its own NIC server-side, so neither sends a nic parameter.)
 */

package lk.sliit.microgrid.data.remote

import lk.sliit.microgrid.data.model.Reservation
import lk.sliit.microgrid.data.model.ReservationSummary
import org.json.JSONObject
import java.net.URLEncoder

/**
 * One page of reservations plus the total number of rows matching the filters, before paging -
 * read from the X-Total-Count response header.
 */
data class ReservationPage(val items: List<Reservation>, val totalCount: Int)

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
     * Lists the logged-in prosumer's own reservations, paged and filtered by the dashboard:
     * scope ("current" | "history"), a free-text search (NIC, name or station - all pointless
     * for a prosumer's own NIC, but station name search is still useful) and a from/to date
     * range on the slot start time. Every filter is sent to the API as a query parameter and
     * applied there; nothing is filtered on the device. nic is never sent - the API already
     * scopes a Prosumer token to its own bookings, whatever is asked for.
     */
    fun list(
        token: String,
        scope: String? = null,
        search: String? = null,
        from: String? = null,
        to: String? = null,
        page: Int = 1,
        pageSize: Int = 50
    ): ReservationPage {
        val query = StringBuilder("/api/reservations?page=$page&pageSize=$pageSize")
        if (!scope.isNullOrBlank()) query.append("&scope=").append(encode(scope))
        if (!search.isNullOrBlank()) query.append("&search=").append(encode(search))
        if (!from.isNullOrBlank()) query.append("&from=").append(encode(from))
        if (!to.isNullOrBlank()) query.append("&to=").append(encode(to))

        val response = ApiClient.requestArrayWithTotal(query.toString(), token = token)
        val items = (0 until response.items.length()).map { index -> parse(response.items.getJSONObject(index)) }
        return ReservationPage(items, response.totalCount)
    }

    /**
     * Reservation counts by status for the logged-in prosumer (GET /api/reservations/summary).
     * Used for the dashboard's count tiles; no count is worked out on the device.
     */
    fun getSummary(token: String): ReservationSummary {
        val json = ApiClient.request("/api/reservations/summary", token = token)
        return ReservationSummary(
            pending = json.optInt("pending"),
            approved = json.optInt("approved"),
            completed = json.optInt("completed"),
            cancelled = json.optInt("cancelled"),
            approvedUpcoming = json.optInt("approvedUpcoming")
        )
    }

    /**
     * URL-encodes one query parameter value, so a search term with spaces or symbols cannot
     * break the request's query string.
     */
    private fun encode(value: String): String = URLEncoder.encode(value, "UTF-8")

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
