/*
 * File: ApiClient.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: The single place where the Android app talks to the C# Web API. Every screen
 *              calls the API through here, so the base address, the auth token and the error
 *              handling are written once. The app never touches MongoDB directly.
 *              (BASE_URL moved to a BuildConfig field, and requestArrayWithTotal added, by
 *              Member D, 2026-09-28, for the prosumer dashboard's paged, filtered list and its
 *              X-Total-Count header.)
 */

package lk.sliit.microgrid.data.remote

import android.util.Log
import lk.sliit.microgrid.BuildConfig
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
 * One page of a JSON array response, together with the total row count read from the
 * X-Total-Count response header (see GET /api/reservations, which paginates this way instead
 * of changing its response body shape).
 */
data class ArrayPage(val items: JSONArray, val totalCount: Int)

/**
 * Sends requests to the Web API using HttpURLConnection, which is part of Android itself.
 * No third party networking library is used, so the app stays pure native.
 */
object ApiClient {

    /**
     * Base address of the API, read from BuildConfig.API_BASE_URL (see app/build.gradle.kts),
     * so it is set in exactly one place and never hard-coded in source. The default
     * (http://10.0.2.2:8080) points at the Android emulator's alias for the IIS-hosted API on
     * the development machine; override it for a physical device by adding a line to the
     * git-ignored mobile/local.properties:
     *
     *     API_BASE_URL=http://172.20.10.4:8080
     *
     * A real phone needs the host machine's LAN or hotspot address, which can change on
     * reconnect. Whichever address is used must also be added to
     * res/xml/network_security_config.xml, since Android blocks plain HTTP otherwise.
     */
    const val BASE_URL: String = BuildConfig.API_BASE_URL

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
     * Sends a request to an API endpoint that returns a JSON array paged with an
     * X-Total-Count response header, for example GET /api/reservations. Call this on a
     * background thread.
     */
    fun requestArrayWithTotal(
        path: String,
        method: String = "GET",
        body: JSONObject? = null,
        token: String? = null
    ): ArrayPage {
        val connection = openConnection(path, method, body != null, token)

        try {
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

            val items = if (text.isBlank()) JSONArray() else JSONArray(text)
            // getHeaderField does a case-insensitive name match, so the exact casing the
            // server sent the header in does not matter here.
            val totalCount = connection.getHeaderField("X-Total-Count")?.toIntOrNull() ?: items.length()

            return ArrayPage(items, totalCount)
        } catch (exception: ApiException) {
            throw exception
        } catch (exception: SocketTimeoutException) {
            Log.w(TAG, "Timed out calling $method $path", exception)
            throw ApiException(
                "The server did not respond in time. Check the API is running and reachable.",
                0
            )
        } catch (exception: Exception) {
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
