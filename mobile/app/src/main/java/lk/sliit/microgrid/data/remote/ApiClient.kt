/*
 * File: ApiClient.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: The single place where the Android app talks to the C# Web API. Every screen
 *              calls the API through here, so the base address, the auth token and the error
 *              handling are written once. The app never touches MongoDB directly.
 */

package lk.sliit.microgrid.data.remote

import android.util.Log
import org.json.JSONObject
import org.json.JSONArray
import java.io.BufferedReader
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.URL

/**
 * Thrown when the API answers with a failure. Carries the HTTP status so a screen can tell
 * 401 (wrong details) apart from 403 (account not allowed in).
 */
class ApiException(message: String, val statusCode: Int) : Exception(message)

/**
 * Sends requests to the Web API using HttpURLConnection, which is part of Android itself.
 * No third party networking library is used, so the app stays pure native.
 */
object ApiClient {

    /**
     * Base address of the API.
     *
     * 10.0.2.2 is a special address in the Android emulator that points back at the
     * development machine. A real phone on the same Wi-Fi must use the machine's LAN
     * address instead, for example http://192.168.1.6:5288
     */
    const val BASE_URL: String = "http://10.0.2.2:5288"

    private const val CONNECT_TIMEOUT_MS = 15000
    private const val READ_TIMEOUT_MS = 15000

    // Tag used for this class's lines in Logcat.
    private const val TAG = "ApiClient"

    /**
     * Sends one request and returns the response body as a JSONObject.
     * Adds the JSON content type and the bearer token when one is given, and throws an
     * ApiException when the API answers with a failure status.
     *
     * Call this on a background thread. Android blocks network calls on the main thread.
     */
    fun request(
        path: String,
        method: String = "GET",
        body: JSONObject? = null,
        token: String? = null
    ): JSONObject {
        val connection = openConnection(path, method, body != null, token)

        try {
            // Write the request body first, when there is one to send.
            if (body != null) {
                connection.outputStream.use { output ->
                    output.write(body.toString().toByteArray(Charsets.UTF_8))
                }
            }

            val status = connection.responseCode
            val text = readBody(connection, status)

            if (status !in 200..299) {
                throw ApiException(readErrorMessage(text, status), status)
            }

            // 204 No Content and empty bodies are valid successful answers.
            return if (text.isBlank()) JSONObject() else JSONObject(text)
        } catch (exception: ApiException) {
            throw exception
        } catch (exception: SocketTimeoutException) {
            // The request went out but no answer came back in time. The real cause is logged
            // so it can be read in Logcat instead of being hidden behind a general message.
            Log.w(TAG, "Timed out calling $method $path", exception)
            throw ApiException(
                "The server did not respond in time. Check the API is running and reachable.",
                0
            )
        } catch (exception: Exception) {
            // Anything else means the server could not be reached or the answer was unreadable.
            Log.w(TAG, "Could not call $method $path", exception)
            throw ApiException(
                "Cannot reach the server. Check the API is running and the address is correct.",
                0
            )
        } finally {
            connection.disconnect()
        }
    }

    /**
        * Sends a request to an API endpoint that returns a JSON array.
        *
        * Example response:
        * [
        *   { "id": "...", "name": "Station 1" },
        *   { "id": "...", "name": "Station 2" }
        * ]
        *
        * Call this on a background thread.
        */
    fun requestArray(
        path: String,
        method: String = "GET",
        body: JSONObject? = null,
        token: String? = null
    ): JSONArray {
        val connection = openConnection(path, method, body != null, token)

        try {
            // Write request body when required.
            if (body != null) {
                connection.outputStream.use { output ->
                    output.write(body.toString().toByteArray(Charsets.UTF_8))
                }
            }

            val status = connection.responseCode
            val text = readBody(connection, status)

            if (status !in 200..299) {
                throw ApiException(
                    readErrorMessage(text, status),
                    status
                )
            }

            // Empty successful response.
            return if (text.isBlank()) {
                JSONArray()
            } else {
                JSONArray(text)
            }

        } catch (exception: ApiException) {
            throw exception

        } catch (exception: SocketTimeoutException) {
            Log.w(
                TAG,
                "Timed out calling $method $path",
                exception
            )

            throw ApiException(
                "The server did not respond in time. Check the API is running and reachable.",
                0
            )

        } catch (exception: Exception) {
            Log.w(
                TAG,
                "Could not call $method $path",
                exception
            )

            throw ApiException(
                "Cannot reach the server. Check the API is running and the address is correct.",
                0
            )

        } finally {
            connection.disconnect()
        }
    }

    /**
     * Builds and configures the connection for one request.
     */
    private fun openConnection(
        path: String,
        method: String,
        hasBody: Boolean,
        token: String?
    ): HttpURLConnection {
        val connection = URL("$BASE_URL$path").openConnection() as HttpURLConnection
        connection.requestMethod = method
        connection.connectTimeout = CONNECT_TIMEOUT_MS
        connection.readTimeout = READ_TIMEOUT_MS
        connection.setRequestProperty("Accept", "application/json")

        if (hasBody) {
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
        }

        if (!token.isNullOrBlank()) {
            connection.setRequestProperty("Authorization", "Bearer $token")
        }

        return connection
    }

    /**
     * Reads the response text. Failure statuses put the body on the error stream instead
     * of the normal input stream, so both are handled here.
     */
    private fun readBody(connection: HttpURLConnection, status: Int): String {
        val stream = if (status in 200..299) connection.inputStream else connection.errorStream
        return stream?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
    }

    /**
     * Turns the API's error body into a message a user can read. Handles our own
     * { "error": "..." } shape and ASP.NET's validation problem details.
     */
    private fun readErrorMessage(text: String, status: Int): String {
        if (text.isBlank()) {
            return "Request failed with status $status."
        }

        return try {
            val json = JSONObject(text)

            when {
                json.has("error") -> json.getString("error")

                // ASP.NET model validation returns { "errors": { "Field": ["message"] } }.
                json.has("errors") -> {
                    val errors = json.getJSONObject("errors")
                    val messages = mutableListOf<String>()
                    for (key in errors.keys()) {
                        val list = errors.getJSONArray(key)
                        for (index in 0 until list.length()) {
                            messages.add(list.getString(index))
                        }
                    }
                    if (messages.isEmpty()) "Request failed with status $status."
                    else messages.joinToString(" ")
                }

                json.has("title") -> json.getString("title")

                else -> "Request failed with status $status."
            }
        } catch (exception: Exception) {
            "Request failed with status $status."
        }
    }
}
