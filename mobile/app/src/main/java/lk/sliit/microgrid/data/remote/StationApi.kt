package lk.sliit.microgrid.data.remote

import lk.sliit.microgrid.data.model.Station
import org.json.JSONArray

object StationApi {

    fun getStations(token: String): List<Station> {

        // GET /api/stations returns a raw JSON array.
        val response = ApiClient.requestArray(
            path = "/api/stations",
            method = "GET",
            token = token
        )

        return parseStations(response)
    }

    private fun parseStations(array: JSONArray): List<Station> {

        val stations = mutableListOf<Station>()

        for (index in 0 until array.length()) {

            val json = array.getJSONObject(index)

            stations.add(
                Station(
                    id = json.getString("id"),
                    name = json.getString("name"),
                    address = json.getString("address"),
                    latitude = json.getDouble("latitude"),
                    longitude = json.getDouble("longitude"),
                    capacityKwh = json.getDouble("capacityKwh"),
                    operatingStartTime = json.getString("operatingStartTime"),
                    operatingEndTime = json.getString("operatingEndTime"),
                    status = json.getString("status")
                )
            )
        }

        return stations
    }
}