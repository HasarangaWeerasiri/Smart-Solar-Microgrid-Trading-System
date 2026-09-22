/*
 * File: ProsumerApi.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-23
 * Description: Calls for the prosumer endpoints of the Web API. These only send and receive
 *              data. Every rule - the NIC format, whether the NIC is already registered, and
 *              the fact that a new account starts Pending - is decided by the API.
 */

package lk.sliit.microgrid.data.remote

import lk.sliit.microgrid.data.model.ProsumerProfile
import org.json.JSONObject

/**
 * Prosumer account calls used by the register and profile screens.
 */
object ProsumerApi {

    /**
     * Registers a new prosumer. No token is sent, because the person has no account yet.
     * The API creates the account with status Pending, so a Backoffice officer must
     * approve it before the person can log in.
     */
    fun register(
        nic: String,
        fullName: String,
        password: String,
        email: String?,
        phone: String?,
        address: String?
    ): ProsumerProfile {
        val body = JSONObject()
            .put("nic", nic)
            .put("fullName", fullName)
            .put("password", password)
            .put("email", email ?: JSONObject.NULL)
            .put("phone", phone ?: JSONObject.NULL)
            .put("address", address ?: JSONObject.NULL)

        val response = ApiClient.request("/api/prosumers", method = "POST", body = body)
        return toProfile(response)
    }

    /**
     * Turns an account JSON object from the API into a ProsumerProfile.
     * Missing optional fields come back as null rather than the text "null".
     */
    private fun toProfile(json: JSONObject): ProsumerProfile {
        return ProsumerProfile(
            nic = json.optString("nic").ifBlank { json.optString("userId") },
            fullName = json.optString("fullName"),
            email = readOptional(json, "email"),
            phone = readOptional(json, "phone"),
            address = readOptional(json, "address"),
            status = json.optString("status")
        )
    }

    /**
     * Reads a field that the API may send as null, returning a real null instead of text.
     */
    private fun readOptional(json: JSONObject, name: String): String? {
        if (json.isNull(name)) {
            return null
        }

        return json.optString(name).takeIf { it.isNotBlank() }
    }
}
