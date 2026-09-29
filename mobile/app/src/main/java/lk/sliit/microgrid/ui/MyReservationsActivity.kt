/*
 * File: MyReservationsActivity.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-25
 * Description: The prosumer's upcoming bookings (Pending or Approved, not yet finished), soonest
 *              first. Tapping one opens its details, where it can be changed or cancelled.
 *              The list is read live from the API every time the screen is shown, so it is up to
 *              date after a change or cancellation. The API only returns the caller's own bookings.
 */

package lk.sliit.microgrid.ui

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

class MyReservationsActivity : NetworkPermissionActivity() {

    private lateinit var container: LinearLayout
    private lateinit var listState: TextView
    private lateinit var errorText: TextView
    private lateinit var progressBar: ProgressBar

    // Used to move back to the main thread after a network call finishes.
    private val mainHandler = Handler(Looper.getMainLooper())

    private var token = ""

    /**
     * Checks the saved session and connects the buttons. The list itself loads in onResume.
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_my_reservations)

        val savedToken = SessionManager(this).getToken()
        if (savedToken == null) {
            ApiFailure.openLogin(this)
            return
        }
        token = savedToken

        container = findViewById(R.id.container_reservations)
        listState = findViewById(R.id.text_list_state)
        errorText = findViewById(R.id.text_error)
        progressBar = findViewById(R.id.progress_list)

        findViewById<Button>(R.id.button_refresh).setOnClickListener { loadReservations() }
        findViewById<Button>(R.id.button_book_new).setOnClickListener {
            startActivity(Intent(this, BookReservationActivity::class.java))
        }
    }

    /**
     * Reloads the list whenever the screen comes back into view, for example after the
     * prosumer changed or cancelled a booking.
     */
    override fun onResume() {
        super.onResume()
        if (token.isNotEmpty()) {
            loadReservations()
        }
    }

    /**
     * Reads the prosumer's bookings on a background thread and keeps the upcoming open ones.
     */
    private fun loadReservations() {
        progressBar.visibility = View.VISIBLE
        errorText.visibility = View.GONE
        listState.text = getString(R.string.my_bookings_loading)

        withLocalNetworkPermission {
            Thread {
                try {
                    val now = System.currentTimeMillis()
                    val upcoming = ReservationApi.listMine(token)
                        .filter { it.status == "Pending" || it.status == "Approved" }
                        .filter { (ReservationTime.parse(it.reservationEnd)?.time ?: 0L) > now }
                        .sortedBy { ReservationTime.parse(it.reservationStart)?.time ?: 0L }

                    mainHandler.post {
                        if (isFinishing || isDestroyed) return@post
                        progressBar.visibility = View.GONE
                        showReservations(upcoming)
                    }
                } catch (exception: ApiException) {
                    mainHandler.post {
                        if (isFinishing || isDestroyed) return@post
                        progressBar.visibility = View.GONE
                        if (!ApiFailure.redirectIfSessionExpired(this, exception)) {
                            listState.text = ""
                            showError(exception.message ?: getString(R.string.error_request_failed))
                        }
                    }
                }
            }.start()
        }
    }

    /**
     * Draws one card per booking. Tapping a card opens its details.
     */
    private fun showReservations(reservations: List<Reservation>) {
        container.removeAllViews()

        listState.text = if (reservations.isEmpty()) {
            getString(R.string.my_bookings_empty)
        } else {
            getString(R.string.my_bookings_count, reservations.size)
        }

        for (reservation in reservations) {
            val card = layoutInflater.inflate(R.layout.item_reservation, container, false)

            card.findViewById<TextView>(R.id.item_station).text = reservation.stationName ?: "-"
            StatusBadge.apply(card.findViewById(R.id.item_status), reservation.status)
            card.findViewById<TextView>(R.id.item_slot).text = reservation.slotName ?: "-"
            card.findViewById<TextView>(R.id.item_time).text =
                ReservationTime.formatRange(reservation.reservationStart, reservation.reservationEnd)

            // canModify comes from the API, which applies the 12 hour rule.
            card.findViewById<TextView>(R.id.item_note).text =
                if (reservation.canModify) {
                    ReservationTime.formatRelative(reservation.reservationStart)
                } else {
                    "${ReservationTime.formatRelative(reservation.reservationStart)} · ${getString(R.string.locked_under_12_hours)}"
                }

            card.setOnClickListener { ReservationDetailsActivity.start(this, reservation.id) }
            container.addView(card)
        }
    }

    /**
     * Shows a message in the screen's error area.
     */
    private fun showError(message: String) {
        errorText.text = message
        errorText.visibility = View.VISIBLE
    }

    /**
     * Shows the permission refusal in this screen's own error area.
     */
    override fun onLocalNetworkPermissionDenied() {
        progressBar.visibility = View.GONE
        showError(getString(R.string.error_local_network_denied))
    }
}
