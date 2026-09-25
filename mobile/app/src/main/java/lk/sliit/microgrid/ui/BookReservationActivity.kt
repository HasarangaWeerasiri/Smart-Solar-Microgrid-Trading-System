/*
 * File: BookReservationActivity.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-25
 * Description: Booking screen for a solar prosumer. The prosumer picks a station, optionally a
 *              day, then one of the station's open slots, and books it. The same screen is used
 *              in "change mode" to move an existing booking to another slot. On success the
 *              summary screen shows the booking as saved.
 *
 *              Business rules (7 day rule, 12 hour rule on changes, one booking per slot,
 *              active station and slot) are checked by the API only. The slot list hides
 *              closed and past slots to keep it short, but that is a display filter; the API's
 *              message is shown if it refuses.
 */

package lk.sliit.microgrid.ui

import android.app.DatePickerDialog
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.ProgressBar
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.Spinner
import android.widget.TextView
import lk.sliit.microgrid.R
import lk.sliit.microgrid.data.local.SessionManager
import lk.sliit.microgrid.data.model.EnergySlot
import lk.sliit.microgrid.data.model.Reservation
import lk.sliit.microgrid.data.model.Station
import lk.sliit.microgrid.data.remote.ApiException
import lk.sliit.microgrid.data.remote.ReservationApi
import lk.sliit.microgrid.data.remote.SlotApi
import lk.sliit.microgrid.data.remote.StationApi
import lk.sliit.microgrid.util.ReservationTime
import java.util.Calendar

class BookReservationActivity : NetworkPermissionActivity() {

    companion object {
        private const val EXTRA_CHANGE_ID = "lk.sliit.microgrid.extra.CHANGE_RESERVATION_ID"
        private const val EXTRA_CHANGE_STATION_ID = "lk.sliit.microgrid.extra.CHANGE_STATION_ID"
        private const val EXTRA_CHANGE_SLOT_ID = "lk.sliit.microgrid.extra.CHANGE_SLOT_ID"
        private const val EXTRA_CHANGE_LABEL = "lk.sliit.microgrid.extra.CHANGE_LABEL"

        /**
         * Opens this screen in change mode, to move an existing booking to another slot.
         * It starts on the booking's station and does not offer its current slot.
         */
        fun startForChange(context: Context, reservation: Reservation) {
            val label = context.getString(
                R.string.current_booking,
                reservation.slotName ?: "-",
                ReservationTime.formatRange(reservation.reservationStart, reservation.reservationEnd)
            )
            context.startActivity(
                Intent(context, BookReservationActivity::class.java)
                    .putExtra(EXTRA_CHANGE_ID, reservation.id)
                    .putExtra(EXTRA_CHANGE_STATION_ID, reservation.stationId)
                    .putExtra(EXTRA_CHANGE_SLOT_ID, reservation.slotId)
                    .putExtra(EXTRA_CHANGE_LABEL, label)
            )
        }
    }

    private lateinit var stationSpinner: Spinner
    private lateinit var pickDateButton: Button
    private lateinit var clearDateButton: Button
    private lateinit var slotsHint: TextView
    private lateinit var slotGroup: RadioGroup
    private lateinit var errorText: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var bookButton: Button

    // Used to move back to the main thread after a network call finishes.
    private val mainHandler = Handler(Looper.getMainLooper())

    private var token = ""
    private var stations: List<Station> = emptyList()
    private var openSlots: List<EnergySlot> = emptyList()

    // Day chosen in the date filter, as "yyyy-MM-dd" in local time. Null means any day.
    private var selectedDay: String? = null

    // Number of the newest slot request, so a slow answer for an old station is ignored.
    private var slotRequest = 0

    // Set only in change mode: the booking being moved, its station and its current slot.
    private var changeReservationId: String? = null
    private var changeStationId: String? = null
    private var changeSlotId: String? = null

    /**
     * Checks the saved session, reads change-mode details if any, connects the controls and
     * loads the stations.
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_book_reservation)

        val savedToken = SessionManager(this).getToken()
        if (savedToken == null) {
            ApiFailure.openLogin(this)
            return
        }
        token = savedToken

        stationSpinner = findViewById(R.id.spinner_station)
        pickDateButton = findViewById(R.id.button_pick_date)
        clearDateButton = findViewById(R.id.button_clear_date)
        slotsHint = findViewById(R.id.text_slots_hint)
        slotGroup = findViewById(R.id.radio_slots)
        errorText = findViewById(R.id.text_error)
        progressBar = findViewById(R.id.progress_book)
        bookButton = findViewById(R.id.button_book)

        changeReservationId = intent.getStringExtra(EXTRA_CHANGE_ID)
        changeStationId = intent.getStringExtra(EXTRA_CHANGE_STATION_ID)
        changeSlotId = intent.getStringExtra(EXTRA_CHANGE_SLOT_ID)
        if (isChangeMode()) {
            showChangeModeText(intent.getStringExtra(EXTRA_CHANGE_LABEL))
        }

        pickDateButton.setOnClickListener { showDatePicker() }
        clearDateButton.setOnClickListener { clearDay() }
        bookButton.setOnClickListener { attemptBooking() }

        showStationChoices(listOf(getString(R.string.loading_stations)))
        loadStations()
    }

    /**
     * True when this screen is moving an existing booking rather than making a new one.
     */
    private fun isChangeMode(): Boolean = changeReservationId != null

    /**
     * Swaps the title, explanation and button text for change mode, and shows the current booking.
     */
    private fun showChangeModeText(currentLabel: String?) {
        findViewById<TextView>(R.id.text_title).setText(R.string.change_title)
        findViewById<TextView>(R.id.text_subtitle).setText(R.string.change_subtitle)
        bookButton.setText(R.string.save_new_slot)

        val current = findViewById<TextView>(R.id.text_current_booking)
        current.text = currentLabel
        current.visibility = if (currentLabel.isNullOrBlank()) View.GONE else View.VISIBLE
    }

    /**
     * Reads the stations from the API on a background thread and keeps the active ones.
     */
    private fun loadStations() {
        withLocalNetworkPermission {
            Thread {
                try {
                    val active = StationApi.getStations(token).filter { it.status == "Active" }
                    mainHandler.post {
                        if (isFinishing || isDestroyed) return@post
                        stations = active
                        showStationChoices(
                            listOf(getString(R.string.choose_station)) + active.map { "${it.name} - ${it.address}" }
                        )
                    }
                } catch (exception: ApiException) {
                    mainHandler.post { handleFailure(exception) }
                }
            }.start()
        }
    }

    /**
     * Fills the station drop-down. The first entry is a prompt, not a station. In change mode
     * the booking's own station is selected straight away.
     */
    private fun showStationChoices(labels: List<String>) {
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, labels)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        stationSpinner.adapter = adapter

        stationSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            /**
             * Loads the chosen station's slots, or clears the list when the prompt is chosen.
             */
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                val station = stations.getOrNull(position - 1)
                if (station == null) {
                    slotRequest++
                    openSlots = emptyList()
                    slotGroup.removeAllViews()
                    slotsHint.text = getString(R.string.slots_choose_station_first)
                } else {
                    loadSlots(station)
                }
            }

            /**
             * Nothing to do: the prompt entry stays selected.
             */
            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
        }

        val currentStation = stations.indexOfFirst { it.id == changeStationId }
        if (currentStation >= 0) {
            stationSpinner.setSelection(currentStation + 1)
        }
    }

    /**
     * Reads one station's slots on a background thread and keeps the open, upcoming ones,
     * soonest first. In change mode the booking's current slot is left out. Only the answer to
     * the newest request is shown.
     */
    private fun loadSlots(station: Station) {
        val requestId = ++slotRequest
        slotGroup.removeAllViews()
        slotsHint.text = getString(R.string.slots_loading)
        hideError()

        withLocalNetworkPermission {
            Thread {
                try {
                    val now = System.currentTimeMillis()
                    val open = SlotApi.getSlotsByStation(station.id, token)
                        .filter { it.status == "Active" && it.isAvailable && it.id != changeSlotId }
                        .filter { (ReservationTime.parse(it.startTime)?.time ?: 0L) > now }
                        .sortedBy { ReservationTime.parse(it.startTime)?.time ?: 0L }

                    mainHandler.post {
                        if (isFinishing || isDestroyed || requestId != slotRequest) return@post
                        openSlots = open
                        showSlots()
                    }
                } catch (exception: ApiException) {
                    mainHandler.post {
                        if (requestId == slotRequest) handleFailure(exception)
                    }
                }
            }.start()
        }
    }

    /**
     * Shows the open slots as a list of choices, narrowed to the chosen day when there is one.
     */
    private fun showSlots() {
        slotGroup.removeAllViews()

        val day = selectedDay
        val visible = if (day == null) {
            openSlots
        } else {
            openSlots.filter { slot ->
                ReservationTime.parse(slot.startTime)?.let { ReservationTime.localDayKey(it) } == day
            }
        }

        slotsHint.text = when {
            openSlots.isEmpty() -> getString(R.string.slots_none_at_station)
            visible.isEmpty() -> getString(R.string.slots_none_on_day)
            else -> getString(R.string.slots_count, visible.size)
        }

        val padding = (10 * resources.displayMetrics.density).toInt()
        for (slot in visible) {
            val option = RadioButton(this).apply {
                id = View.generateViewId()
                tag = slot.id
                text = getString(
                    R.string.slot_option,
                    slot.slotName,
                    ReservationTime.formatRange(slot.startTime, slot.endTime),
                    ReservationTime.formatRelative(slot.startTime)
                )
                textSize = 15f
                setPadding(padding / 2, padding, 0, padding)
            }
            slotGroup.addView(
                option,
                RadioGroup.LayoutParams(RadioGroup.LayoutParams.MATCH_PARENT, RadioGroup.LayoutParams.WRAP_CONTENT)
            )
        }
    }

    /**
     * Opens the phone's date picker, starting today. Choosing a day narrows the slot list.
     */
    private fun showDatePicker() {
        val today = Calendar.getInstance()

        val dialog = DatePickerDialog(
            this,
            { _, year, month, dayOfMonth ->
                val chosen = Calendar.getInstance().apply { set(year, month, dayOfMonth, 12, 0, 0) }
                selectedDay = ReservationTime.localDayKey(chosen.time)
                pickDateButton.text = ReservationTime.formatDay(chosen.time)
                clearDateButton.visibility = View.VISIBLE
                showSlots()
            },
            today.get(Calendar.YEAR),
            today.get(Calendar.MONTH),
            today.get(Calendar.DAY_OF_MONTH)
        )
        dialog.datePicker.minDate = today.timeInMillis - 1000
        dialog.show()
    }

    /**
     * Removes the day filter so every open slot is shown again.
     */
    private fun clearDay() {
        selectedDay = null
        pickDateButton.text = getString(R.string.any_date)
        clearDateButton.visibility = View.GONE
        showSlots()
    }

    /**
     * Sends the chosen slot to the API: a new booking, or in change mode a move of the existing
     * one. On success the summary screen opens; on failure the API's own message is shown, for
     * example when the slot was just taken or the 12 hour rule blocks the change.
     */
    private fun attemptBooking() {
        val chosen = slotGroup.findViewById<RadioButton>(slotGroup.checkedRadioButtonId)
        val slotId = chosen?.tag as? String

        if (slotId == null) {
            showError(getString(R.string.error_choose_slot))
            return
        }

        withLocalNetworkPermission {
            showBooking(true)
            hideError()

            Thread {
                try {
                    val changeId = changeReservationId
                    val reservation = if (changeId != null) {
                        ReservationApi.update(changeId, slotId, token)
                    } else {
                        ReservationApi.create(slotId, token)
                    }
                    val action = if (changeId != null) {
                        ReservationSummaryActivity.ACTION_UPDATED
                    } else {
                        ReservationSummaryActivity.ACTION_BOOKED
                    }

                    mainHandler.post {
                        if (isFinishing || isDestroyed) return@post
                        ReservationSummaryActivity.start(this, action, reservation)
                        finish()
                    }
                } catch (exception: ApiException) {
                    mainHandler.post {
                        showBooking(false)
                        handleFailure(exception)
                    }
                }
            }.start()
        }
    }

    /**
     * Shows an API failure, or sends the user to sign in when the login has expired.
     */
    private fun handleFailure(exception: ApiException) {
        if (isFinishing || isDestroyed) return
        if (ApiFailure.redirectIfSessionExpired(this, exception)) return
        showError(exception.message ?: getString(R.string.error_request_failed))
    }

    /**
     * Shows or hides the spinner and stops the button being pressed twice.
     */
    private fun showBooking(isBooking: Boolean) {
        progressBar.visibility = if (isBooking) View.VISIBLE else View.GONE
        bookButton.isEnabled = !isBooking
        bookButton.text = getString(
            when {
                isBooking && isChangeMode() -> R.string.saving
                isBooking -> R.string.booking
                isChangeMode() -> R.string.save_new_slot
                else -> R.string.book_this_slot
            }
        )
    }

    /**
     * Shows a message in the screen's error area.
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
        showBooking(false)
        showError(getString(R.string.error_local_network_denied))
    }
}
