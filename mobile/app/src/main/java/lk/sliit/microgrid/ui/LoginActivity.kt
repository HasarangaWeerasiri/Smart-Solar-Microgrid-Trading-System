/*
 * File: LoginActivity.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: The first screen of the app. Sends the login details to the Web API and
 *              opens the home screen that matches the user's role. If a session is already
 *              saved in SQLite, it skips straight to the home screen.
 *
 *              Backoffice accounts are turned away here because they use the web app.
 *
 *              On Android 17 and newer it first asks for the local network permission,
 *              because without it Android silently blocks the call to the development API.
 */

package lk.sliit.microgrid.ui

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import lk.sliit.microgrid.R
import lk.sliit.microgrid.data.local.SessionManager
import lk.sliit.microgrid.data.model.Roles
import lk.sliit.microgrid.data.remote.ApiException
import lk.sliit.microgrid.data.remote.AuthApi

class LoginActivity : AppCompatActivity() {

    companion object {
        // Android 17 (API level 37) introduced the local network permission.
        private const val ANDROID_17 = 37
        private const val LOCAL_NETWORK_PERMISSION = "android.permission.ACCESS_LOCAL_NETWORK"
    }

    private lateinit var sessionManager: SessionManager
    private lateinit var identifierInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var loginButton: Button
    private lateinit var errorText: TextView
    private lateinit var progressBar: ProgressBar

    // Used to move back to the main thread after the network call finishes.
    private val mainHandler = Handler(Looper.getMainLooper())

    // Shows Android's permission pop-up. When the user answers, the login continues or
    // a message explains how to turn the permission on.
    private val localNetworkPermissionRequest =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) {
                attemptLogin()
            } else {
                showError(getString(R.string.error_local_network_denied))
            }
        }

    /**
     * Sets up the screen. If a session is already stored in SQLite, the user is sent
     * straight to their home screen without logging in again.
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        sessionManager = SessionManager(this)

        val savedUser = sessionManager.getUser()
        if (savedUser != null) {
            val home = homeScreenForRole(savedUser.role)
            if (home != null) {
                openHome(home)
                return
            }
            // A stored role that has no mobile screen is not usable, so drop it.
            sessionManager.clear()
        }

        identifierInput = findViewById(R.id.input_identifier)
        passwordInput = findViewById(R.id.input_password)
        loginButton = findViewById(R.id.button_login)
        errorText = findViewById(R.id.text_error)
        progressBar = findViewById(R.id.progress_login)

        loginButton.setOnClickListener { attemptLogin() }
    }

    /**
     * Reads the form, checks it is filled in, and runs the login on a background thread.
     * Android does not allow network calls on the main thread.
     */
    private fun attemptLogin() {
        val identifier = identifierInput.text.toString().trim()
        val password = passwordInput.text.toString()

        if (identifier.isEmpty() || password.isEmpty()) {
            showError(getString(R.string.error_fill_both_fields))
            return
        }

        // Without this permission Android drops the request and it only times out later.
        // Ask first; the permission callback calls attemptLogin() again once it is allowed.
        if (needsLocalNetworkPermission()) {
            localNetworkPermissionRequest.launch(LOCAL_NETWORK_PERMISSION)
            return
        }

        showLoading(true)
        hideError()

        Thread {
            try {
                val user = AuthApi.login(identifier, password)
                val home = homeScreenForRole(user.role)

                mainHandler.post {
                    showLoading(false)

                    if (home == null) {
                        // Backoffice staff have no screens in the mobile app.
                        showError(getString(R.string.error_backoffice_use_web))
                        return@post
                    }

                    // Save the session so the next launch does not ask for a password.
                    sessionManager.save(user)
                    openHome(home)
                }
            } catch (exception: ApiException) {
                mainHandler.post {
                    showLoading(false)
                    showError(exception.message ?: getString(R.string.error_login_failed))
                }
            }
        }.start()
    }

    /**
     * True when this phone runs Android 17 or newer and the local network permission has
     * not been granted yet. Older Android versions have no such permission and need nothing.
     */
    private fun needsLocalNetworkPermission(): Boolean {
        if (Build.VERSION.SDK_INT < ANDROID_17) {
            return false
        }

        return ContextCompat.checkSelfPermission(this, LOCAL_NETWORK_PERMISSION) !=
            PackageManager.PERMISSION_GRANTED
    }

    /**
     * Returns the home screen for a role, or null when that role has no mobile screen.
     */
    private fun homeScreenForRole(role: String): Class<*>? {
        return when (role) {
            Roles.PROSUMER -> ProsumerHomeActivity::class.java
            Roles.GRID_OPERATOR -> OperatorHomeActivity::class.java
            else -> null
        }
    }

    /**
     * Opens a home screen and closes the login screen, so the back button does not
     * return to a login form the user has already passed.
     */
    private fun openHome(home: Class<*>) {
        startActivity(Intent(this, home))
        finish()
    }

    /**
     * Shows or hides the spinner and stops the button being pressed twice.
     */
    private fun showLoading(isLoading: Boolean) {
        progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        loginButton.isEnabled = !isLoading
        loginButton.text =
            if (isLoading) getString(R.string.signing_in) else getString(R.string.sign_in)
    }

    /**
     * Shows the message the API sent back, so the user sees the real reason.
     */
    private fun showError(message: String) {
        errorText.text = message
        errorText.visibility = View.VISIBLE
    }

    /**
     * Hides the error message before a new attempt.
     */
    private fun hideError() {
        errorText.visibility = View.GONE
    }
}
