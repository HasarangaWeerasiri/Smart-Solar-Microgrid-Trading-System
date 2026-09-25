/*
 * File: ReservationDetailsActivity.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-25
 * Description: One booking's details, read fresh from the API each time the screen is shown.
 *              From here the prosumer can change the slot (opens the booking screen in change
 *              mode) or cancel the booking (after a confirm dialog). Both lead to the summary page.
 *
 *              Business rule 6 (12 hours' notice) is decided by the API. The buttons are always
 *              shown but only pressable while the API's canModify flag is true, and the API refuses the request
 *              anyway if the rule is broken; its message is then shown here.
 */

package lk.sliit.microgrid.ui

import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import lk.sliit.microgrid.R
import lk.sliit.microgrid.data.local.SessionManager
import lk.sliit.microgrid.data.model.Reservation
import lk.sliit.microgrid.data.remote.ApiException
import lk.sliit.microgrid.data.remote.ReservationApi
import lk.sliit.microgrid.util.ReservationTime

class ReservationDetailsActivity : NetworkPermissionActivity() {

    companion object {
        private const val EXTRA_RESERVATION_ID = "lk.sliit.microgrid.extra.RESERVATION_ID"

        /**
         * Opens the details of one booking.
         */
        fun start(context: Context, reservationId: String) {
            context.startActivity(
                Intent(context, ReservationDetailsActivity::class.java).putExtra(EXTRA_RESERVATION_ID, reservationId)
            )
        }
    }

    private lateinit var detailsGroup: LinearLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var errorText: TextView
    private lateinit var lockedNote: TextView
    private lateinit var changeButton: Button
    private lateinit var cancelButton: Button

    // Used to move back to the main thread after a network call finishes.
    private val mainHandler = Handler(Looper.getMainLooper())

    private var token = ""
    private var reservationId = ""
    private var current: Reservation? = null

    /**
     * Checks the session and the booking id, and connects the buttons. The booking loads in onResume.
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_reservation_details)

        val savedToken = SessionManager(this).getToken()
        val id = intent.getStringExtra(EXTRA_RESERVATION_ID)
        if (savedToken == null || id == null) {
            if (savedToken == null) ApiFailure.openLogin(this) else finish()
            return
        }
        token = savedToken
        reservationId = id

        detailsGroup = findViewById(R.id.group_details)
        progressBar = findViewById(R.id.progress_details)
        errorText = findViewById(R.id.text_error)
        lockedNote = findViewById(R.id.text_locked_note)
        changeButton = findViewById(R.id.button_change_slot)
        cancelButton = findViewById(R.id.button_cancel_booking)

        changeButton.setOnClickListener {
            current?.let { BookReservationActivity.startForChange(this, it) }
        }
        cancelButton.setOnClickListener { confirmCancel() }
    }

    /**
     * Reloads the booking every time the screen is shown, so its status and canModify are current.
     */
    override fun onResume() {
        super.onResume()
        if (reservationId.isNotEmpty()) {
            loadReservation()
        }
    }

    /**
     * Reads the booking from the API on a background thread.
     */
    private fun loadReservation() {
        progressBar.visibility = View.VISIBLE
        errorText.visibility = View.GONE

        withLocalNetworkPermission {
            Thread {
                try {
                    val reservation = ReservationApi.get(reservationId, token)
                    mainHandler.post {
                        if (isFinishing || isDestroyed) return@post
                        progressBar.visibility = View.GONE
                        showReservation(reservation)
                    }
                } catch (exception: ApiException) {
                    mainHandler.post { showFailure(exception) }
                }
            }.start()
        }
    }

    /**
     * Fills in the booking and decides which buttons to offer, using the API's canModify flag.
     */
    private fun showReservation(reservation: Reservation) {
        current = reservation
        detailsGroup.visibility = View.VISIBLE

        StatusBadge.apply(findViewById(R.id.text_status), reservation.status)
        findViewById<TextView>(R.id.value_station).text = reservation.stationName ?: "-"
        findViewById<TextView>(R.id.value_slot).text = reservation.slotName ?: "-"
        findViewById<TextView>(R.id.value_date_time).text =
            "${ReservationTime.formatRange(reservation.reservationStart, reservation.reservationEnd)} " +
                "(${ReservationTime.formatRelative(reservation.reservationStart)})"
        findViewById<TextView>(R.id.value_reservation_id).text = reservation.id
        findViewById<TextView>(R.id.value_booked_on).text = ReservationTime.formatDateTime(reservation.createdAt)

        // Both buttons are always shown, but only pressable while the API allows a change.
        changeButton.isEnabled = reservation.canModify
        cancelButton.isEnabled = reservation.canModify
        cancelButton.text = getString(R.string.cancel_booking)

        if (reservation.canModify) {
            lockedNote.visibility = View.GONE
        } else {
            lockedNote.visibility = View.VISIBLE
            val isOpen = reservation.status == "Pending" || reservation.status == "Approved"
            lockedNote.text = if (isOpen) {
                getString(R.string.details_locked_time)
            } else {
                getString(R.string.details_locked_status, reservation.status)
            }
        }
    }

    /**
     * Asks the prosumer to confirm before cancelling, showing what will be cancelled.
     */
    private fun confirmCancel() {
        val reservation = current ?: return

        AlertDialog.Builder(this)
            .setTitle(R.string.cancel_confirm_title)
            .setMessage(
                getString(
                    R.string.cancel_confirm_message,
                    reservation.slotName ?: "-",
                    reservation.stationName ?: "-",
                    ReservationTime.formatRange(reservation.reservationStart, reservation.reservationEnd)
                )
            )
            .setPositiveButton(R.string.cancel_booking) { _, _ -> cancelReservation(reservation) }
            .setNegativeButton(R.string.keep_booking, null)
            .show()
    }

    /**
     * Sends the cancellation to the API. On success the summary page opens; if the API refuses
     * (for example less than 12 hours to go), its message is shown here.
     */
    private fun cancelReservation(reservation: Reservation) {
        changeButton.isEnabled = false
        cancelButton.isEnabled = false
        cancelButton.text = getString(R.string.cancelling)
        errorText.visibility = View.GONE

        withLocalNetworkPermission {
            Thread {
                try {
                    val cancelled = ReservationApi.cancel(reservation.id, token)
                    mainHandler.post {
                        if (isFinishing || isDestroyed) return@post
                        ReservationSummaryActivity.start(this, ReservationSummaryActivity.ACTION_CANCELLED, cancelled)
                        finish()
                    }
                } catch (exception: ApiException) {
                    mainHandler.post {
                        showFailure(exception)
                        current?.let { showReservation(it) }
                    }
                }
            }.start()
        }
    }

    /**
     * Shows an API failure, or sends the user to sign in when the login has expired.
     */
    private fun showFailure(exception: ApiException) {
        if (isFinishing || isDestroyed) return
        progressBar.visibility = View.GONE

        if (ApiFailure.redirectIfSessionExpired(this, exception)) return

        errorText.text = exception.message ?: getString(R.string.error_request_failed)
        errorText.visibility = View.VISIBLE
    }

    /**
     * Shows the permission refusal in this screen's own error area.
     */
    override fun onLocalNetworkPermissionDenied() {
        progressBar.visibility = View.GONE
        errorText.text = getString(R.string.error_local_network_denied)
        errorText.visibility = View.VISIBLE
    }
}
