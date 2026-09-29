package lk.sliit.microgrid.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.maps.model.MarkerOptions
import lk.sliit.microgrid.R
import lk.sliit.microgrid.data.local.SessionManager
import lk.sliit.microgrid.data.model.Station
import lk.sliit.microgrid.data.remote.ApiException
import lk.sliit.microgrid.data.remote.StationApi
import kotlin.concurrent.thread

class NearbyNodesMapActivity :
    AppCompatActivity(),
    OnMapReadyCallback {

    private lateinit var sessionManager: SessionManager

    private lateinit var progressBar: ProgressBar
    private lateinit var textMessage: TextView
    private lateinit var textStationCount: TextView

    private var googleMap: GoogleMap? = null

    /*
     * We keep the API stations here because:
     *
     * 1. The API may finish first
     * 2. Google Maps may finish first
     *
     * renderStationMarkers() only runs when both are available.
     */
    private var loadedStations: List<Station> = emptyList()


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(R.layout.activity_nearby_nodes_map)

        sessionManager = SessionManager(this)

        progressBar = findViewById(R.id.progress_map)
        textMessage = findViewById(R.id.text_map_message)
        textStationCount = findViewById(R.id.text_station_count)


        // -------------------------
        // Back button
        // -------------------------

        findViewById<TextView>(R.id.button_back)
            .setOnClickListener {
                finish()
            }


        // -------------------------
        // Google Map
        // -------------------------

        val mapFragment =
            supportFragmentManager
                .findFragmentById(R.id.map_fragment)
                    as SupportMapFragment

        mapFragment.getMapAsync(this)


        // -------------------------
        // Authentication
        // -------------------------

        val token = sessionManager.getToken()

        if (token.isNullOrBlank()) {
            returnToLogin()
            return
        }


        // -------------------------
        // Load stations
        // -------------------------

        loadStations(token)
    }


    // ============================================================
    // MAP READY
    // ============================================================

    override fun onMapReady(map: GoogleMap) {

        googleMap = map


        // Map controls
        map.uiSettings.isZoomControlsEnabled = true
        map.uiSettings.isCompassEnabled = true
        map.uiSettings.isMapToolbarEnabled = false


        /*
         * User taps marker information window.
         *
         * Marker
         *    ↓
         * Station
         *    ↓
         * Details dialog
         */
        map.setOnInfoWindowClickListener { marker ->

            val station =
                marker.tag as? Station

            if (station != null) {
                showStationDetails(station)
            }
        }


        /*
         * API may already have finished.
         */
        renderStationMarkers()
    }


    // ============================================================
    // LOAD STATIONS
    // ============================================================

    private fun loadStations(token: String) {

        progressBar.visibility = View.VISIBLE

        textMessage.visibility = View.GONE

        textStationCount.text =
            "Loading grid nodes..."


        thread {

            try {

                /*
                 * Reuse your existing working API.
                 *
                 * Do NOT create another station API.
                 */
                val stations =
                    StationApi.getStations(token)


                runOnUiThread {

                    progressBar.visibility =
                        View.GONE


                    /*
                     * For the prosumer map we show Active stations.
                     *
                     * The normal list can still show every station.
                     */
                    loadedStations =
                        stations.filter {
                            it.status.equals(
                                "Active",
                                ignoreCase = true
                            )
                        }


                    if (loadedStations.isEmpty()) {

                        textStationCount.text =
                            "0 Active Grid Nodes"

                        textMessage.text =
                            "No active grid nodes are currently available."

                        textMessage.visibility =
                            View.VISIBLE

                    } else {

                        textStationCount.text =
                            if (loadedStations.size == 1) {
                                "1 Active Grid Node"
                            } else {
                                "${loadedStations.size} Active Grid Nodes"
                            }


                        renderStationMarkers()
                    }
                }


            } catch (exception: ApiException) {

                runOnUiThread {

                    progressBar.visibility =
                        View.GONE


                    if (exception.statusCode == 401) {

                        sessionManager.clear()

                        returnToLogin()

                    } else {

                        textStationCount.text =
                            "Unable to load stations"

                        textMessage.text =
                            exception.message
                                ?: "Failed to load grid nodes."

                        textMessage.visibility =
                            View.VISIBLE
                    }
                }


            } catch (exception: Exception) {

                runOnUiThread {

                    progressBar.visibility =
                        View.GONE

                    textStationCount.text =
                        "Unable to load stations"

                    textMessage.text =
                        "Unable to load grid nodes."

                    textMessage.visibility =
                        View.VISIBLE
                }
            }
        }
    }


    // ============================================================
    // CREATE MARKERS
    // ============================================================

    private fun renderStationMarkers() {

        val map =
            googleMap ?: return


        if (loadedStations.isEmpty()) {
            return
        }


        map.clear()


        val boundsBuilder =
            LatLngBounds.Builder()


        var markerCount = 0

        var firstPosition: LatLng? =
            null


        loadedStations.forEach { station ->


            // Ignore bad coordinates
            if (!isValidCoordinate(
                    station.latitude,
                    station.longitude
                )
            ) {

                return@forEach
            }


            // API coordinates -> Google Maps coordinates
            val stationPosition =
                LatLng(
                    station.latitude,
                    station.longitude
                )


            if (firstPosition == null) {
                firstPosition =
                    stationPosition
            }


            // Create marker
            val marker =
                map.addMarker(

                    MarkerOptions()
                        .position(
                            stationPosition
                        )
                        .title(
                            station.name
                        )
                        .snippet(
                            "${station.address} • ${station.capacityKwh} kWh"
                        )
                )


            /*
             * Attach Station object to marker.
             *
             * This is what lets us know which station
             * was clicked.
             */
            marker?.tag =
                station


            boundsBuilder.include(
                stationPosition
            )


            markerCount++
        }


        // Update count in case some stations had bad coordinates
        textStationCount.text =
            when (markerCount) {

                0 ->
                    "0 Mapped Grid Nodes"

                1 ->
                    "1 Active Grid Node"

                else ->
                    "$markerCount Active Grid Nodes"
            }


        if (markerCount == 0) {

            textMessage.text =
                "No stations have valid map coordinates."

            textMessage.visibility =
                View.VISIBLE

            return
        }


        moveCameraToStations(
            map,
            boundsBuilder,
            markerCount,
            firstPosition
        )
    }


    // ============================================================
    // CAMERA
    // ============================================================

    private fun moveCameraToStations(
        map: GoogleMap,
        boundsBuilder: LatLngBounds.Builder,
        markerCount: Int,
        firstPosition: LatLng?
    ) {


        /*
         * One station:
         *
         * Zoom directly to it.
         */
        if (
            markerCount == 1 &&
            firstPosition != null
        ) {

            map.animateCamera(

                CameraUpdateFactory
                    .newLatLngZoom(
                        firstPosition,
                        14f
                    )
            )

            return
        }


        /*
         * Multiple stations:
         *
         * Fit every marker inside the screen.
         */
        map.setOnMapLoadedCallback {

            try {

                val bounds =
                    boundsBuilder.build()


                map.animateCamera(

                    CameraUpdateFactory
                        .newLatLngBounds(
                            bounds,
                            100
                        )
                )


            } catch (exception: Exception) {


                /*
                 * Fallback camera position.
                 */
                if (firstPosition != null) {

                    map.moveCamera(

                        CameraUpdateFactory
                            .newLatLngZoom(
                                firstPosition,
                                10f
                            )
                    )
                }
            }
        }
    }


    // ============================================================
    // COORDINATE VALIDATION
    // ============================================================

    private fun isValidCoordinate(
        latitude: Double,
        longitude: Double
    ): Boolean {

        return (
            latitude in -90.0..90.0 &&
            longitude in -180.0..180.0 &&
            !(latitude == 0.0 &&
                    longitude == 0.0)
        )
    }


    // ============================================================
    // STATION DETAILS
    // ============================================================

    private fun showStationDetails(
        station: Station
    ) {

        val message = """
            Address: ${station.address}

            Capacity: ${station.capacityKwh} kWh

            Operating Hours:
            ${station.operatingStartTime} - ${station.operatingEndTime}

            Status: ${station.status}

            Latitude: ${station.latitude}
            Longitude: ${station.longitude}
        """.trimIndent()


        AlertDialog.Builder(this)
            .setTitle(
                station.name
            )
            .setMessage(
                message
            )
            .setPositiveButton(
                "Close",
                null
            )
            .show()
    }


    // ============================================================
    // RETURN TO LOGIN
    // ============================================================

    private fun returnToLogin() {

        val intent =
            Intent(
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