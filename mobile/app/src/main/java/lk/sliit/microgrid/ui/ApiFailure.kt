/*
 * File: ApiFailure.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-25
 * Description: Shared handling for an expired login on the reservation screens. When the API
 *              answers 401, the saved session is cleared and the user is sent back to sign in,
 *              instead of every screen repeating the same code.
 */

package lk.sliit.microgrid.ui

import android.app.Activity
import android.content.Intent
import android.widget.Toast
import lk.sliit.microgrid.R
import lk.sliit.microgrid.data.local.SessionManager
import lk.sliit.microgrid.data.remote.ApiException

/**
 * Helpers for API failures shown on the reservation screens.
 */
object ApiFailure {

    /**
     * If the failure is an expired or rejected login (401), clears the session, opens the login
     * screen and returns true. Returns false for any other failure, which the screen shows itself.
     */
    fun redirectIfSessionExpired(activity: Activity, exception: ApiException): Boolean {
        if (exception.statusCode != 401) {
            return false
        }

        Toast.makeText(activity, R.string.error_session_expired, Toast.LENGTH_LONG).show()
        SessionManager(activity).clear()
        openLogin(activity)
        return true
    }

    /**
     * Opens the login screen and clears every screen behind it.
     */
    fun openLogin(activity: Activity) {
        val intent = Intent(activity, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        activity.startActivity(intent)
        activity.finish()
    }
}
