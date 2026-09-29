/*
 * File: ProsumerApi.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-23
 * Description: Calls for the prosumer endpoints of the Web API. These only send and receive
 *              data. Every rule - the NIC format, whether the NIC is already registered, and
 *              the fact that a new account starts Pending - is decided by the API.
 *              (getProfile, updateProfile and requestDeactivation added 2026-09-29 for the
 *              profile screen. The API only lets a prosumer read or change their own account,
 *              so these send the saved login token.)
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
     * Reads the prosumer's own profile. The API answers 403 if the token belongs to
     * somebody else, so a prosumer can only ever load their own details.
     */
    fun getProfile(nic: String, token: String): ProsumerProfile {
        val response = ApiClient.request("/api/prosumers/$nic", token = token)
        return toProfile(response)
    }

    /**
     * Saves changes to the prosumer's own profile. The NIC is not sent, because it is the
     * account id and can never change. A blank newPassword means "keep the current one".
     */
    fun updateProfile(
        nic: String,
        token: String,
        fullName: String,
        email: String?,
        phone: String?,
        address: String?,
        newPassword: String?
    ): ProsumerProfile {
        val body = JSONObject()
            .put("fullName", fullName)
            .put("email", email ?: JSONObject.NULL)
            .put("phone", phone ?: JSONObject.NULL)
            .put("address", address ?: JSONObject.NULL)
            .put("newPassword", newPassword ?: JSONObject.NULL)

        val response = ApiClient.request("/api/prosumers/$nic", method = "PUT", body = body, token = token)
        return toProfile(response)
    }

    /**
     * Asks the API to deactivate the prosumer's own account. After this the person can no
     * longer log in, and only a Backoffice officer can activate the account again.
     */
    fun requestDeactivation(nic: String, token: String): ProsumerProfile {
        val response = ApiClient.request("/api/prosumers/$nic/deactivate", method = "PATCH", token = token)
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
