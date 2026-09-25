/*
 * File: ProsumerHomeActivity.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Home screen for a solar prosumer.
 */

package lk.sliit.microgrid.ui

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import lk.sliit.microgrid.R
import lk.sliit.microgrid.data.local.SessionManager

class ProsumerHomeActivity : AppCompatActivity() {

    private lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_prosumer_home)

        sessionManager = SessionManager(this)

        val user = sessionManager.getUser()

        // No session means this screen was opened without logging in.
        if (user == null) {
            returnToLogin()
            return
        }

        // Display logged-in user information.
        findViewById<TextView>(R.id.text_welcome).text =
            getString(R.string.welcome_named, user.fullName)

        findViewById<TextView>(R.id.text_nic).text =
            getString(R.string.nic_label, user.userId)

        findViewById<TextView>(R.id.text_role).text =
            getString(R.string.role_label, user.role)

        // IT23245556 - Open the energy slot booking screen and the prosumer's booking list.
        findViewById<Button>(R.id.button_book_slot).setOnClickListener {
            startActivity(Intent(this, BookReservationActivity::class.java))
        }
        findViewById<Button>(R.id.button_my_bookings).setOnClickListener {
            startActivity(Intent(this, MyReservationsActivity::class.java))
        }

        // Open Nearby Grid Nodes screen.
        findViewById<Button>(R.id.button_nearby_nodes).setOnClickListener {
            openNearbyNodes()
        }

        // Logout.
        findViewById<Button>(R.id.button_logout).setOnClickListener {
            logout()
        }
    }

    /**
     * Opens the Nearby Grid Nodes screen.
     */
    private fun openNearbyNodes() {

        val intent = Intent(
            this,
            NearbyNodesActivity::class.java
        )

        startActivity(intent)
    }

    /**
     * Clears the stored session and returns to login.
     */
    private fun logout() {
        sessionManager.clear()
        returnToLogin()
    }

    /**
     * Opens the login screen and clears the screens behind it.
     */
    private fun returnToLogin() {

        val intent = Intent(
            this,
            LoginActivity::class.java
        )

        intent.flags =
            Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_CLEAR_TASK

        startActivity(intent)
        finish()
    }
}