/*
 * File: ReservationSummaryActivity.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-25
 * Description: Summary page shown after each reservation action (booked, changed, cancelled).
 *              It shows the booking exactly as the API saved and returned it: status, station,
 *              slot, date and time, and whether it can still be changed (the API's canModify).
 */

package lk.sliit.microgrid.ui

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import lk.sliit.microgrid.R
import lk.sliit.microgrid.data.model.Reservation
import lk.sliit.microgrid.util.ReservationTime

class ReservationSummaryActivity : AppCompatActivity() {

    companion object {
        /** The booking was just created. */
        const val ACTION_BOOKED = "booked"

        /** The booking was moved to another slot. */
        const val ACTION_UPDATED = "updated"

        /** The booking was cancelled. */
        const val ACTION_CANCELLED = "cancelled"

        private const val EXTRA_ACTION = "lk.sliit.microgrid.extra.RESERVATION_ACTION"
        private const val EXTRA_RESERVATION = "lk.sliit.microgrid.extra.RESERVATION"

        /**
         * Opens the summary for a booking the API has just returned.
         */
        fun start(context: Context, action: String, reservation: Reservation) {
            val intent = Intent(context, ReservationSummaryActivity::class.java)
                .putExtra(EXTRA_ACTION, action)
                .putExtra(EXTRA_RESERVATION, reservation)
            context.startActivity(intent)
        }
    }

    /**
     * Reads the booking handed over by the previous screen and fills in the summary.
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_reservation_summary)

        val reservation = readReservation()
        if (reservation == null) {
            finish()
            return
        }
        val action = intent.getStringExtra(EXTRA_ACTION) ?: ACTION_BOOKED

        showHeading(action)
        showDetails(reservation)
        showModifyNote(action, reservation)
        setUpButtons(action)
    }

    /**
     * Reads the booking from the intent. Android 13 added a type-safe version of this call;
     * older versions use the original one, which is why there are two branches.
     */
    private fun readReservation(): Reservation? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getSerializableExtra(EXTRA_RESERVATION, Reservation::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getSerializableExtra(EXTRA_RESERVATION) as? Reservation
        }
    }

    /**
     * Sets the title and explanation for what just happened.
     */
    private fun showHeading(action: String) {
        val (title, message) = when (action) {
            ACTION_UPDATED -> R.string.summary_updated_title to R.string.summary_updated_message
            ACTION_CANCELLED -> R.string.summary_cancelled_title to R.string.summary_cancelled_message
            else -> R.string.summary_booked_title to R.string.summary_booked_message
        }
        findViewById<TextView>(R.id.text_summary_title).setText(title)
        findViewById<TextView>(R.id.text_summary_message).setText(message)
    }

    /**
     * Shows the booking's status, station, slot, time and id, as saved by the API.
     */
    private fun showDetails(reservation: Reservation) {
        StatusBadge.apply(findViewById(R.id.text_status), reservation.status)

        findViewById<TextView>(R.id.value_station).text = reservation.stationName ?: "-"
        findViewById<TextView>(R.id.value_slot).text = reservation.slotName ?: "-"
        findViewById<TextView>(R.id.value_date_time).text =
            "${ReservationTime.formatRange(reservation.reservationStart, reservation.reservationEnd)} " +
                "(${ReservationTime.formatRelative(reservation.reservationStart)})"
        findViewById<TextView>(R.id.value_reservation_id).text = reservation.id
        findViewById<TextView>(R.id.value_updated).text = ReservationTime.formatDateTime(reservation.updatedAt)
    }

    /**
     * Tells the prosumer whether the booking can still be changed. The answer comes from the
     * API's canModify flag, which applies the 12 hour rule on the server. Not shown after a
     * cancellation, because a cancelled booking is closed.
     */
    private fun showModifyNote(action: String, reservation: Reservation) {
        val note = findViewById<TextView>(R.id.text_modify_note)

        if (action == ACTION_CANCELLED) {
            note.visibility = View.GONE
            return
        }

        note.setText(if (reservation.canModify) R.string.summary_can_modify else R.string.summary_cannot_modify)
    }

    /**
     * After a booking, offers to book another slot; after a change or cancellation, offers the
     * booking list. Every summary offers a way back home.
     */
    private fun setUpButtons(action: String) {
        val primary = findViewById<Button>(R.id.button_primary)

        if (action == ACTION_BOOKED) {
            primary.setText(R.string.book_another_slot)
            primary.setOnClickListener {
                startActivity(Intent(this, BookReservationActivity::class.java))
                finish()
            }
        } else {
            primary.setText(R.string.view_my_bookings)
            primary.setOnClickListener { openMyBookings() }
        }

        findViewById<Button>(R.id.button_home).setOnClickListener { goHome() }
    }

    /**
     * Opens the booking list, closing the details screens left behind it so the list is fresh.
     */
    private fun openMyBookings() {
        val intent = Intent(this, MyReservationsActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        startActivity(intent)
        finish()
    }

    /**
     * Returns to the prosumer home screen, closing any screens opened on top of it.
     */
    private fun goHome() {
        val intent = Intent(this, ProsumerHomeActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        startActivity(intent)
        finish()
    }
}
