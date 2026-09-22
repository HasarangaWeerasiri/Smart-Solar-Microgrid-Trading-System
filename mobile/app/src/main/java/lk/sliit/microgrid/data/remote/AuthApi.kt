/*
 * File: AuthApi.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Calls for the authentication endpoints of the Web API. These only send and
 *              receive data - every rule about who may log in is decided by the API.
 */

package lk.sliit.microgrid.data.remote

import lk.sliit.microgrid.data.model.LoggedInUser
import org.json.JSONObject

/**
 * Authentication calls used by the login screen.
 */
object AuthApi {

    /**
     * Sends login details to the API. Staff use their email, prosumers use their NIC.
     * Returns the signed-in user with the token, or throws an ApiException with the reason.
     */
    fun login(identifier: String, password: String): LoggedInUser {
        val body = JSONObject()
            .put("identifier", identifier)
            .put("password", password)

        val response = ApiClient.request("/api/auth/login", method = "POST", body = body)

        return LoggedInUser(
            userId = response.getString("userId"),
            fullName = response.getString("fullName"),
            email = response.optString("email").takeIf { it.isNotBlank() && it != "null" },
            role = response.getString("role"),
            status = response.getString("status"),
            token = response.getString("token")
        )
    }

    /**
     * Asks the API who the saved token belongs to. Used to confirm a stored session is
     * still valid when the app reopens.
     */
    fun me(token: String): JSONObject {
        return ApiClient.request("/api/auth/me", token = token)
    }
}
