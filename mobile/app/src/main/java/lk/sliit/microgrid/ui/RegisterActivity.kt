/*
 * File: RegisterActivity.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-23
 * Description: Sign-up screen for a solar prosumer. The NIC becomes the account id, so it
 *              is entered once here and can never be changed afterwards.
 *
 *              The account is created with status Pending. The person cannot log in until a
 *              Backoffice officer approves it in the web application, so this screen says so
 *              clearly instead of sending them to a login that would refuse them.
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
import androidx.appcompat.app.AlertDialog
import lk.sliit.microgrid.R
import lk.sliit.microgrid.data.remote.ApiException
import lk.sliit.microgrid.data.remote.ProsumerApi

class RegisterActivity : NetworkPermissionActivity() {

    private lateinit var nicInput: EditText
    private lateinit var fullNameInput: EditText
    private lateinit var emailInput: EditText
    private lateinit var phoneInput: EditText
    private lateinit var addressInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var registerButton: Button
    private lateinit var errorText: TextView
    private lateinit var progressBar: ProgressBar

    // Used to move back to the main thread after the network call finishes.
    private val mainHandler = Handler(Looper.getMainLooper())

    /**
     * Finds the input fields and connects the register button.
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_register)

        nicInput = findViewById(R.id.input_nic)
        fullNameInput = findViewById(R.id.input_full_name)
        emailInput = findViewById(R.id.input_email)
        phoneInput = findViewById(R.id.input_phone)
        addressInput = findViewById(R.id.input_address)
        passwordInput = findViewById(R.id.input_password)
        registerButton = findViewById(R.id.button_register)
        errorText = findViewById(R.id.text_error)
        progressBar = findViewById(R.id.progress_register)

        registerButton.setOnClickListener { attemptRegister() }
        findViewById<TextView>(R.id.link_sign_in).setOnClickListener { finish() }
    }

    /**
     * Checks the required fields are filled in, then sends the registration to the API on
     * a background thread. The NIC format itself is checked by the API, which is the one
     * place that rule lives.
     */
    private fun attemptRegister() {
        val nic = nicInput.text.toString().trim()
        val fullName = fullNameInput.text.toString().trim()
        val password = passwordInput.text.toString()

        if (nic.isEmpty() || fullName.isEmpty() || password.isEmpty()) {
            showError(getString(R.string.error_fill_required_fields))
            return
        }

        val email = emailInput.text.toString().trim().ifBlank { null }
        val phone = phoneInput.text.toString().trim().ifBlank { null }
        val address = addressInput.text.toString().trim().ifBlank { null }

        // Android 17 needs permission before the app may reach the development server.
        withLocalNetworkPermission {
            showLoading(true)
            hideError()

            Thread {
                try {
                    val profile = ProsumerApi.register(nic, fullName, password, email, phone, address)
                    mainHandler.post {
                        showLoading(false)
                        showSuccessDialog(profile.fullName)
                    }
                } catch (exception: ApiException) {
                    mainHandler.post {
                        showLoading(false)
                        showError(exception.message ?: getString(R.string.error_register_failed))
                    }
                }
            }.start()
        }
    }

    /**
     * Explains that the account was created but still needs approval, then returns to the
     * login screen. Without this the person would try to log in and simply be refused.
     */
    private fun showSuccessDialog(fullName: String) {
        AlertDialog.Builder(this)
            .setTitle(R.string.register_success_title)
            .setMessage(getString(R.string.register_success_message, fullName))
            .setCancelable(false)
            .setPositiveButton(R.string.back_to_sign_in) { _, _ -> finish() }
            .show()
    }

    /**
     * Shows or hides the spinner and stops the button being pressed twice.
     */
    private fun showLoading(isLoading: Boolean) {
        progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        registerButton.isEnabled = !isLoading
        registerButton.text =
            if (isLoading) getString(R.string.registering) else getString(R.string.create_account)
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
