/*
 * File: ProsumerDashboardActivity.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Member D
 * Created: 2026-09-28
 * Description: The prosumer's dashboard: four count tiles from GET /api/reservations/summary,
 *              a Current bookings / Booking history tab pair (scope=current | scope=history),
 *              a debounced search box and a date range filter - all sent to the API as query
 *              parameters, never applied on the device. Tapping a booking opens the existing
 *              ReservationDetailsActivity.
 *
 *              On launch the last successful answer is read from the local SQLite cache
 *              (ReservationCache) and shown immediately, then a fresh answer is requested from
 *              the API and both the screen and the cache are updated. If the API cannot be
 *              reached, the cached data stays on screen behind a "Showing saved data" banner
 *              instead of leaving an empty screen or crashing.
 */

package lk.sliit.microgrid.ui

import android.app.DatePickerDialog
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.android.material.tabs.TabLayout
import lk.sliit.microgrid.R
import lk.sliit.microgrid.data.local.ReservationCache
import lk.sliit.microgrid.data.local.SessionManager
import lk.sliit.microgrid.data.model.Reservation
import lk.sliit.microgrid.data.model.ReservationSummary
import lk.sliit.microgrid.data.remote.ApiException
import lk.sliit.microgrid.data.remote.ReservationApi
import lk.sliit.microgrid.util.ReservationTime
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

class ProsumerDashboardActivity : NetworkPermissionActivity() {

    companion object {
        private const val SCOPE_CURRENT = "current"
        private const val SCOPE_HISTORY = "history"
        private const val SEARCH_DEBOUNCE_MS = 300L
        private const val PAGE_SIZE = 50
    }

    private lateinit var cache: ReservationCache
    private lateinit var adapter: ReservationAdapter

    private lateinit var offlineBanner: TextView
    private lateinit var tileValues: Map<String, TextView>
    private lateinit var tabLayout: TabLayout
    private lateinit var searchInput: EditText
    private lateinit var buttonDateFrom: Button
    private lateinit var buttonDateTo: Button
    private lateinit var listStateText: TextView
    private lateinit var errorText: TextView
    private lateinit var retryButton: Button
    private lateinit var progressBar: ProgressBar
    private lateinit var swipeRefresh: SwipeRefreshLayout

    // Used to move back to the main thread after a network call finishes, and to debounce the
    // search box.
    private val mainHandler = Handler(Looper.getMainLooper())
    private var searchRunnable: Runnable? = null

    private var token = ""
    private var currentScope = SCOPE_CURRENT
    private var searchQuery = ""
    private var fromDateIso: String? = null
    private var toDateIso: String? = null

    /**
     * Checks the saved session, wires up every view, shows whatever is cached so the screen is
     * never empty on first paint, then lets onResume trigger the real API call.
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_prosumer_dashboard)

        val savedToken = SessionManager(this).getToken()
        if (savedToken == null) {
            ApiFailure.openLogin(this)
            return
        }
        token = savedToken
        cache = ReservationCache(this)

        bindViews()
        wireListeners()

        renderFromCache()
    }

    /**
     * Reloads from the API whenever the screen comes back into view, for example after
     * returning from a booking's details.
     */
    override fun onResume() {
        super.onResume()
        if (token.isNotEmpty()) {
            loadFromApi(showSpinner = true)
        }
    }

    /**
     * Finds every view once and keeps typed references, matching MyReservationsActivity's
     * pattern of one findViewById block in onCreate.
     */
    private fun bindViews() {
        offlineBanner = findViewById(R.id.text_offline_banner)

        tileValues = mapOf(
            "pending" to findViewById<View>(R.id.tile_pending).findViewById(R.id.tile_value),
            "approved" to findViewById<View>(R.id.tile_approved).findViewById(R.id.tile_value),
            "completed" to findViewById<View>(R.id.tile_completed).findViewById(R.id.tile_value),
            "approvedUpcoming" to findViewById<View>(R.id.tile_approved_upcoming).findViewById(R.id.tile_value)
        )

        findViewById<View>(R.id.tile_pending).findViewById<TextView>(R.id.tile_label).text = getString(R.string.tile_pending)
        findViewById<View>(R.id.tile_approved).findViewById<TextView>(R.id.tile_label).text = getString(R.string.tile_approved)
        findViewById<View>(R.id.tile_completed).findViewById<TextView>(R.id.tile_label).text = getString(R.string.tile_completed)
        findViewById<View>(R.id.tile_approved_upcoming).findViewById<TextView>(R.id.tile_label).text =
            getString(R.string.tile_approved_upcoming)

        tabLayout = findViewById(R.id.tab_layout)
        searchInput = findViewById(R.id.input_search)
        buttonDateFrom = findViewById(R.id.button_date_from)
        buttonDateTo = findViewById(R.id.button_date_to)
        listStateText = findViewById(R.id.text_list_state)
        errorText = findViewById(R.id.text_error)
        retryButton = findViewById(R.id.button_retry)
        progressBar = findViewById(R.id.progress_list)
        swipeRefresh = findViewById(R.id.swipe_refresh)

        val recyclerView = findViewById<androidx.recyclerview.widget.RecyclerView>(R.id.recycler_reservations)
        adapter = ReservationAdapter { reservation -> ReservationDetailsActivity.start(this, reservation.id) }
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter
    }

    /**
     * Connects the refresh button, tabs, search box, date pickers, clear button, retry button
     * and pull-to-refresh, all of which end in a call to loadFromApi.
     */
    private fun wireListeners() {
        findViewById<Button>(R.id.button_dashboard_refresh).setOnClickListener { loadFromApi(showSpinner = true) }
        retryButton.setOnClickListener { loadFromApi(showSpinner = true) }
        swipeRefresh.setOnRefreshListener { loadFromApi(showSpinner = false) }

        tabLayout.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab) {
                currentScope = if (tab.position == 0) SCOPE_CURRENT else SCOPE_HISTORY
                renderFromCache()
                loadFromApi(showSpinner = true)
            }

            override fun onTabUnselected(tab: TabLayout.Tab) = Unit
            override fun onTabReselected(tab: TabLayout.Tab) = Unit
        })

        searchInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit

            override fun afterTextChanged(s: Editable?) {
                searchRunnable?.let { mainHandler.removeCallbacks(it) }
                val runnable = Runnable {
                    searchQuery = s?.toString()?.trim().orEmpty()
                    loadFromApi(showSpinner = true)
                }
                searchRunnable = runnable
                mainHandler.postDelayed(runnable, SEARCH_DEBOUNCE_MS)
            }
        })

        buttonDateFrom.setOnClickListener { pickDate(isEndOfDay = false) }
        buttonDateTo.setOnClickListener { pickDate(isEndOfDay = true) }
        findViewById<Button>(R.id.button_clear_filters).setOnClickListener { clearFilters() }
    }

    /**
     * Shows whatever is already cached for the current scope, so the screen has real data on
     * it before the network call has even started.
     */
    private fun renderFromCache() {
        cache.getSummary()?.let { showSummary(it) }
        val cached = cache.getList(currentScope)
        showList(cached, cached.size)
    }

    /**
     * Reads the summary and the current page of reservations from the API on a background
     * thread, then updates the screen and the cache together. showSpinner is false for
     * pull-to-refresh and the search debounce, which use their own, quieter loading cues.
     */
    private fun loadFromApi(showSpinner: Boolean) {
        if (showSpinner) {
            progressBar.visibility = View.VISIBLE
        }
        errorText.visibility = View.GONE
        retryButton.visibility = View.GONE

        withLocalNetworkPermission {
            Thread {
                try {
                    val summary = ReservationApi.getSummary(token)
                    val page = ReservationApi.list(
                        token,
                        scope = currentScope,
                        search = searchQuery.ifBlank { null },
                        from = fromDateIso,
                        to = toDateIso,
                        pageSize = PAGE_SIZE
                    )

                    cache.saveSummary(summary)
                    cache.saveList(currentScope, page.items)

                    mainHandler.post {
                        if (isFinishing || isDestroyed) return@post
                        progressBar.visibility = View.GONE
                        swipeRefresh.isRefreshing = false
                        offlineBanner.visibility = View.GONE
                        showSummary(summary)
                        showList(page.items, page.totalCount)
                    }
                } catch (exception: ApiException) {
                    mainHandler.post {
                        if (isFinishing || isDestroyed) return@post
                        progressBar.visibility = View.GONE
                        swipeRefresh.isRefreshing = false
                        if (!ApiFailure.redirectIfSessionExpired(this, exception)) {
                            handleLoadFailure(exception)
                        }
                    }
                }
            }.start()
        }
    }

    /**
     * Falls back to the cache when the API could not be reached. Shows the cached data with
     * the offline banner when there is any; otherwise shows the normal error and Retry state,
     * so the screen is never simply left blank.
     */
    private fun handleLoadFailure(exception: ApiException) {
        val cachedSummary = cache.getSummary()
        val cachedList = cache.getList(currentScope)

        if (cachedSummary != null || cachedList.isNotEmpty()) {
            offlineBanner.visibility = View.VISIBLE
            cachedSummary?.let { showSummary(it) }
            showList(cachedList, cachedList.size)
        } else {
            adapter.submitList(emptyList())
            listStateText.text = ""
            errorText.text = exception.message ?: getString(R.string.error_request_failed)
            errorText.visibility = View.VISIBLE
            retryButton.visibility = View.VISIBLE
        }
    }

    /**
     * Fills in the four tiles. Every value comes straight from a ReservationSummary - the API's
     * own counts, never re-derived from the list.
     */
    private fun showSummary(summary: ReservationSummary) {
        tileValues.getValue("pending").text = summary.pending.toString()
        tileValues.getValue("approved").text = summary.approved.toString()
        tileValues.getValue("completed").text = summary.completed.toString()
        tileValues.getValue("approvedUpcoming").text = summary.approvedUpcoming.toString()
    }

    /**
     * Shows a page of bookings, and a state line naming the active tab and filters when there
     * are none to show.
     */
    private fun showList(items: List<Reservation>, totalCount: Int) {
        adapter.submitList(items)
        listStateText.text = if (items.isEmpty()) {
            emptyStateMessage()
        } else {
            getString(R.string.dashboard_count, items.size, totalCount)
        }
    }

    /**
     * Builds a message naming whichever filter is active, so an empty list always explains
     * why, instead of just showing nothing.
     */
    private fun emptyStateMessage(): String {
        val hasSearch = searchQuery.isNotBlank()
        val hasDateRange = fromDateIso != null || toDateIso != null

        return when {
            hasSearch && hasDateRange -> getString(R.string.dashboard_empty_search_and_dates, searchQuery)
            hasSearch -> getString(R.string.dashboard_empty_search, searchQuery)
            hasDateRange -> getString(R.string.dashboard_empty_dates)
            currentScope == SCOPE_HISTORY -> getString(R.string.dashboard_empty_history)
            else -> getString(R.string.dashboard_empty_current)
        }
    }

    /**
     * Opens a date picker for the From or To filter and, once a date is chosen, turns it into
     * the start or end of that local day as a UTC ISO string for the API's from/to parameters.
     */
    private fun pickDate(isEndOfDay: Boolean) {
        val today = Calendar.getInstance()

        DatePickerDialog(
            this,
            { _, year, month, dayOfMonth ->
                val iso = isoForLocalDate(year, month, dayOfMonth, isEndOfDay)
                val dayCalendar = Calendar.getInstance().apply { set(year, month, dayOfMonth) }
                val label = ReservationTime.formatDay(dayCalendar.time)

                if (isEndOfDay) {
                    toDateIso = iso
                    buttonDateTo.text = label
                } else {
                    fromDateIso = iso
                    buttonDateFrom.text = label
                }

                loadFromApi(showSpinner = true)
            },
            today.get(Calendar.YEAR),
            today.get(Calendar.MONTH),
            today.get(Calendar.DAY_OF_MONTH)
        ).show()
    }

    /**
     * Turns a calendar date picked in the phone's local time zone into the start or end of
     * that day as a UTC ISO string, the same way the web dashboard builds its from/to filters.
     */
    private fun isoForLocalDate(year: Int, month: Int, dayOfMonth: Int, endOfDay: Boolean): String {
        val calendar = Calendar.getInstance()
        calendar.clear()
        if (endOfDay) {
            calendar.set(year, month, dayOfMonth, 23, 59, 59)
            calendar.set(Calendar.MILLISECOND, 999)
        } else {
            calendar.set(year, month, dayOfMonth, 0, 0, 0)
            calendar.set(Calendar.MILLISECOND, 0)
        }

        val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        format.timeZone = TimeZone.getTimeZone("UTC")
        return format.format(calendar.time)
    }

    /**
     * Resets the search box and the date range, then reloads the unfiltered list for the
     * current tab.
     */
    private fun clearFilters() {
        searchRunnable?.let { mainHandler.removeCallbacks(it) }
        searchInput.setText("")
        searchQuery = ""
        fromDateIso = null
        toDateIso = null
        buttonDateFrom.text = getString(R.string.date_from)
        buttonDateTo.text = getString(R.string.date_to)
        loadFromApi(showSpinner = true)
    }

    /**
     * Shows the permission refusal in this screen's own error area.
     */
    override fun onLocalNetworkPermissionDenied() {
        progressBar.visibility = View.GONE
        swipeRefresh.isRefreshing = false
        errorText.text = getString(R.string.error_local_network_denied)
        errorText.visibility = View.VISIBLE
        retryButton.visibility = View.VISIBLE
    }
}
