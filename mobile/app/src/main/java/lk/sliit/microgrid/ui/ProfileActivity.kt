/*
 * File: ProfileActivity.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-29
 * Description: Lets a solar prosumer see and change their own account details, and request
 *              that their account be deactivated.
 *
 *              The NIC is shown but cannot be edited, because it is the account's primary
 *              key. Deactivation is a request in the sense that it takes effect at once but
 *              cannot be undone by the prosumer: only a Backoffice officer can activate the
 *              account again, which is the rule the API enforces.
 */

package lk.sliit.microgrid.ui

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import lk.sliit.microgrid.R
import lk.sliit.microgrid.data.local.SessionManager
import lk.sliit.microgrid.data.model.ProsumerProfile
import lk.sliit.microgrid.data.remote.ApiException
import lk.sliit.microgrid.data.remote.ProsumerApi

class ProfileActivity : NetworkPermissionActivity() {

    private lateinit var sessionManager: SessionManager

    private lateinit var nicText: TextView
    private lateinit var statusText: TextView
    private lateinit var fullNameInput: EditText
    private lateinit var emailInput: EditText
    private lateinit var phoneInput: EditText
    private lateinit var addressInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var saveButton: Button
    private lateinit var deactivateButton: Button
    private lateinit var errorText: TextView
    private lateinit var progressBar: ProgressBar

    // Used to move back to the main thread after a network call finishes.
    private val mainHandler = Handler(Looper.getMainLooper())

    // The NIC and token of the signed-in prosumer, taken from the saved SQLite session.
    private var nic: String = ""
    private var token: String = ""

    /**
     * Sets up the screen and loads the latest profile from the API.
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_profile)

        sessionManager = SessionManager(this)
        val user = sessionManager.getUser()

        // No session means this screen was opened without logging in.
        if (user == null) {
            ApiFailure.openLogin(this)
            return
        }

        nic = user.userId
        token = user.token

        nicText = findViewById(R.id.text_nic)
        statusText = findViewById(R.id.text_status)
        fullNameInput = findViewById(R.id.input_full_name)
        emailInput = findViewById(R.id.input_email)
        phoneInput = findViewById(R.id.input_phone)
        addressInput = findViewById(R.id.input_address)
        passwordInput = findViewById(R.id.input_password)
        saveButton = findViewById(R.id.button_save)
        deactivateButton = findViewById(R.id.button_deactivate)
        errorText = findViewById(R.id.text_error)
        progressBar = findViewById(R.id.progress_profile)

        nicText.text = getString(R.string.nic_label, nic)

        // Show the name already known from the session, so the screen is never blank
        // while the latest details are being fetched.
        fullNameInput.setText(user.fullName)
        statusText.text = getString(R.string.status_label, user.status)

        saveButton.setOnClickListener { saveProfile() }
        deactivateButton.setOnClickListener { confirmDeactivation() }

        loadProfile()
    }

    /**
     * Fetches the prosumer's own details from the API and fills in the form, so the screen
     * shows what the server holds rather than only what was saved at login.
     */
    private fun loadProfile() {
        withLocalNetworkPermission {
            showLoading(true)
            hideError()

            Thread {
                try {
                    val profile = ProsumerApi.getProfile(nic, token)
                    mainHandler.post {
                        showLoading(false)
                        fillForm(profile)
                    }
                } catch (exception: ApiException) {
                    mainHandler.post {
                        showLoading(false)
                        if (!ApiFailure.redirectIfSessionExpired(this, exception)) {
                            showError(exception.message ?: getString(R.string.error_profile_load_failed))
                        }
                    }
                }
            }.start()
        }
    }

    /**
     * Puts the profile values into the form fields.
     */
    private fun fillForm(profile: ProsumerProfile) {
        fullNameInput.setText(profile.fullName)
        emailInput.setText(profile.email.orEmpty())
        phoneInput.setText(profile.phone.orEmpty())
        addressInput.setText(profile.address.orEmpty())
        statusText.text = getString(R.string.status_label, profile.status)
    }

    /**
     * Sends the edited details to the API. The saved session is updated afterwards, so the
     * home screen greets the prosumer by their new name without needing a fresh login.
     */
    private fun saveProfile() {
        val fullName = fullNameInput.text.toString().trim()

        if (fullName.isEmpty()) {
            showError(getString(R.string.error_full_name_required))
            return
        }

        val email = emailInput.text.toString().trim().ifBlank { null }
        val phone = phoneInput.text.toString().trim().ifBlank { null }
        val address = addressInput.text.toString().trim().ifBlank { null }
        val newPassword = passwordInput.text.toString().ifBlank { null }

        withLocalNetworkPermission {
            showLoading(true)
            hideError()

            Thread {
                try {
                    val updated = ProsumerApi.updateProfile(nic, token, fullName, email, phone, address, newPassword)

                    mainHandler.post {
                        showLoading(false)
                        passwordInput.text.clear()
                        fillForm(updated)

                        // Keep the local session in step with what was just saved.
                        sessionManager.getUser()?.let { current ->
                            sessionManager.save(
                                current.copy(fullName = updated.fullName, email = updated.email)
                            )
                        }

                        Toast.makeText(this, R.string.profile_saved, Toast.LENGTH_SHORT).show()
                    }
                } catch (exception: ApiException) {
                    mainHandler.post {
                        showLoading(false)
                        if (!ApiFailure.redirectIfSessionExpired(this, exception)) {
                            showError(exception.message ?: getString(R.string.error_profile_save_failed))
                        }
                    }
                }
            }.start()
        }
    }

    /**
     * Asks the prosumer to confirm before the account is deactivated, because they cannot
     * undo it themselves afterwards.
     */
    private fun confirmDeactivation() {
        AlertDialog.Builder(this)
            .setTitle(R.string.deactivate_title)
            .setMessage(R.string.deactivate_message)
            .setNegativeButton(R.string.cancel, null)
            .setPositiveButton(R.string.deactivate_confirm) { _, _ -> deactivateAccount() }
            .show()
    }

    /**
     * Deactivates the account, then clears the saved session and returns to the login
     * screen, since the prosumer can no longer log in.
     */
    private fun deactivateAccount() {
        withLocalNetworkPermission {
            showLoading(true)
            hideError()

            Thread {
                try {
                    ProsumerApi.requestDeactivation(nic, token)

                    mainHandler.post {
                        showLoading(false)
                        sessionManager.clear()
                        Toast.makeText(this, R.string.deactivate_done, Toast.LENGTH_LONG).show()
                        ApiFailure.openLogin(this)
                    }
                } catch (exception: ApiException) {
                    mainHandler.post {
                        showLoading(false)
                        if (!ApiFailure.redirectIfSessionExpired(this, exception)) {
                            showError(exception.message ?: getString(R.string.error_deactivate_failed))
                        }
                    }
                }
            }.start()
        }
    }

    /**
     * Shows or hides the spinner and stops the buttons being pressed twice.
     */
    private fun showLoading(isLoading: Boolean) {
        progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        saveButton.isEnabled = !isLoading
        deactivateButton.isEnabled = !isLoading
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

    /**
     * Shows the permission refusal in this screen's own error area.
     */
    override fun onLocalNetworkPermissionDenied() {
        showLoading(false)
        showError(getString(R.string.error_local_network_denied))
    }
}
