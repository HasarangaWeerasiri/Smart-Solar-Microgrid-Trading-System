/*
 * File: NearbyNodesActivity.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Description: Displays grid nodes retrieved from the Web API.
 */

package lk.sliit.microgrid.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import lk.sliit.microgrid.R
import lk.sliit.microgrid.data.local.SessionManager
import lk.sliit.microgrid.data.model.Station
import lk.sliit.microgrid.data.remote.ApiException
import lk.sliit.microgrid.data.remote.StationApi
import kotlin.concurrent.thread

class NearbyNodesActivity : AppCompatActivity() {

    private lateinit var sessionManager: SessionManager

    private lateinit var progressBar: ProgressBar
    private lateinit var textMessage: TextView
    private lateinit var stationContainer: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_nearby_nodes)

        sessionManager = SessionManager(this)

        progressBar = findViewById(R.id.progress_stations)
        textMessage = findViewById(R.id.text_station_message)
        stationContainer = findViewById(R.id.station_container)

        findViewById<Button>(
        R.id.button_view_map
        ).setOnClickListener {

            val intent =
                Intent(
                this,
                NearbyNodesMapActivity::class.java
            )

            startActivity(intent)
        }

        val token = sessionManager.getToken()

        // No saved token means the user must log in again.
        if (token.isNullOrBlank()) {
            returnToLogin()
            return
        }

        loadStations(token)
    }

    /**
     * Loads stations from the API on a background thread.
     */
    private fun loadStations(token: String) {

        progressBar.visibility = View.VISIBLE
        textMessage.visibility = View.GONE
        stationContainer.removeAllViews()

        thread {

            try {

                val stations = StationApi.getStations(token)

                runOnUiThread {

                    progressBar.visibility = View.GONE

                    if (stations.isEmpty()) {

                        textMessage.text = "No grid nodes available."
                        textMessage.visibility = View.VISIBLE

                    } else {

                        displayStations(stations)
                    }
                }

            } catch (exception: ApiException) {

                runOnUiThread {

                    progressBar.visibility = View.GONE

                    // Token is no longer accepted by the API.
                    if (exception.statusCode == 401) {

                        sessionManager.clear()
                        returnToLogin()

                    } else {

                        textMessage.text =
                            exception.message ?: "Failed to load grid nodes."

                        textMessage.visibility = View.VISIBLE
                    }
                }

            } catch (exception: Exception) {

                runOnUiThread {

                    progressBar.visibility = View.GONE
                    textMessage.text = "Unable to load grid nodes."
                    textMessage.visibility = View.VISIBLE
                }
            }
        }
    }

    /**
     * Creates one station card for every station returned by the API.
     */
    private fun displayStations(stations: List<Station>) {

        stationContainer.removeAllViews()

        for (station in stations) {

            val stationView = layoutInflater.inflate(
                R.layout.item_station,
                stationContainer,
                false
            )

            val textName =
                stationView.findViewById<TextView>(
                    R.id.text_station_name
                )

            val textAddress =
                stationView.findViewById<TextView>(
                    R.id.text_station_address
                )

            val textCapacity =
                stationView.findViewById<TextView>(
                    R.id.text_station_capacity
                )

            val textHours =
                stationView.findViewById<TextView>(
                    R.id.text_station_hours
                )

            val textStatus =
                stationView.findViewById<TextView>(
                    R.id.text_station_status
                )

            val buttonDetails =
                stationView.findViewById<Button>(
                    R.id.button_station_details
                )

            textName.text = station.name

            textAddress.text =
                "Address: ${station.address}"

            textCapacity.text =
                "Capacity: ${station.capacityKwh} kWh"

            textHours.text =
                "Operating Hours: ${station.operatingStartTime} - ${station.operatingEndTime}"

            textStatus.text =
                "Status: ${station.status}"

            buttonDetails.setOnClickListener {
                showStationDetails(station)
            }

            stationContainer.addView(stationView)
        }
    }

    /**
     * Displays the selected station's complete information.
     */
    private fun showStationDetails(station: Station) {

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
            .setTitle(station.name)
            .setMessage(message)
            .setPositiveButton("Close", null)
            .show()
    }

    /**
     * Returns to LoginActivity and clears the activity stack.
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