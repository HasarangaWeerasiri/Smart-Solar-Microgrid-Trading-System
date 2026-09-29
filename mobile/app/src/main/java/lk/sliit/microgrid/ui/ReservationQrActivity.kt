/*
 * File: ReservationQrActivity.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Member D
 * Created: 2026-09-28
 * Description: Shows the QR code for an Approved booking, so the prosumer can present it to a
 *              Grid Operator at the station. The booking itself is passed in from
 *              ReservationDetailsActivity (Reservation is Serializable, the same way it is
 *              already handed to ReservationSummaryActivity) so this screen only needs one
 *              call: GET /api/reservations/{id}/qr, for the signed token.
 *
 *              The server issues and signs the token; this screen only draws it as a QR
 *              bitmap. If the booking's status changed since the details screen was loaded
 *              (for example it was cancelled elsewhere in the meantime), the API refuses with
 *              409 and that message is shown here rather than a blank screen.
 */

package lk.sliit.microgrid.ui

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import lk.sliit.microgrid.R
import lk.sliit.microgrid.data.local.SessionManager
import lk.sliit.microgrid.data.model.Reservation
import lk.sliit.microgrid.data.remote.ApiException
import lk.sliit.microgrid.data.remote.ReservationApi
import lk.sliit.microgrid.util.ReservationTime

class ReservationQrActivity : NetworkPermissionActivity() {

    companion object {
        private const val EXTRA_RESERVATION = "lk.sliit.microgrid.extra.RESERVATION"

        // Square QR bitmap size in pixels. Large enough to read cleanly on another phone's
        // camera from a normal handing-over distance.
        private const val QR_SIZE_PX = 800

        /**
         * Opens the QR code screen for one booking. Pass the booking itself (not just its id)
         * since ReservationDetailsActivity already has it fresh from the API.
         */
        fun start(context: Context, reservation: Reservation) {
            context.startActivity(
                Intent(context, ReservationQrActivity::class.java).putExtra(EXTRA_RESERVATION, reservation)
            )
        }
    }

    private lateinit var progressBar: ProgressBar
    private lateinit var errorText: TextView
    private lateinit var detailsGroup: LinearLayout
    private lateinit var qrImage: ImageView
    private lateinit var expiryText: TextView

    private val mainHandler = Handler(Looper.getMainLooper())

    private var token = ""
    private var reservation: Reservation? = null

    /**
     * Checks the session and reads the booking passed in from the details screen. The QR
     * token itself loads in onResume.
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_reservation_qr)

        val savedToken = SessionManager(this).getToken()
        @Suppress("DEPRECATION")
        val passedReservation = intent.getSerializableExtra(EXTRA_RESERVATION) as? Reservation

        if (savedToken == null || passedReservation == null) {
            if (savedToken == null) ApiFailure.openLogin(this) else finish()
            return
        }
        token = savedToken
        reservation = passedReservation

        progressBar = findViewById(R.id.progress_qr)
        errorText = findViewById(R.id.text_error)
        detailsGroup = findViewById(R.id.group_qr_details)
        qrImage = findViewById(R.id.image_qr)
        expiryText = findViewById(R.id.text_qr_expiry)

        findViewById<TextView>(R.id.value_qr_station).text = passedReservation.stationName ?: "-"
        findViewById<TextView>(R.id.value_qr_slot).text = passedReservation.slotName ?: "-"
        findViewById<TextView>(R.id.value_qr_time).text = ReservationTime.formatRange(
            passedReservation.reservationStart,
            passedReservation.reservationEnd
        )
    }

    /**
     * Requests the signed QR token every time the screen is shown, so a stale token from an
     * earlier visit is never displayed.
     */
    override fun onResume() {
        super.onResume()
        if (token.isNotEmpty()) {
            loadQr()
        }
    }

    /**
     * Reads the QR token from the API on a background thread, then draws it as a bitmap.
     */
    private fun loadQr() {
        val id = reservation?.id ?: return
        progressBar.visibility = View.VISIBLE
        errorText.visibility = View.GONE
        detailsGroup.visibility = View.GONE

        withLocalNetworkPermission {
            Thread {
                try {
                    val qr = ReservationApi.getQr(id, token)
                    val bitmap = buildQrBitmap(qr.token, QR_SIZE_PX)

                    mainHandler.post {
                        if (isFinishing || isDestroyed) return@post
                        progressBar.visibility = View.GONE
                        detailsGroup.visibility = View.VISIBLE
                        qrImage.setImageBitmap(bitmap)
                        expiryText.text = getString(R.string.qr_valid_until, ReservationTime.formatExpiry(qr.expiresAt))
                    }
                } catch (exception: ApiException) {
                    mainHandler.post { showFailure(exception) }
                }
            }.start()
        }
    }

    /**
     * Turns the token string into a black-on-white QR bitmap.
     *
     * Adapted from ZXing's own usage pattern for converting a BitMatrix to an Android Bitmap
     * (the same approach ZXing's Android sample app and most published ZXing-on-Android guides
     * use): encode the text to a BitMatrix, then paint one pixel per module.
     */
    private fun buildQrBitmap(content: String, sizePx: Int): Bitmap {
        val hints = mapOf(EncodeHintType.MARGIN to 1)
        val matrix = QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, sizePx, sizePx, hints)

        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.RGB_565)
        for (x in 0 until sizePx) {
            for (y in 0 until sizePx) {
                bitmap.setPixel(x, y, if (matrix[x, y]) Color.BLACK else Color.WHITE)
            }
        }
        return bitmap
    }

    /**
     * Shows an API failure - most often 409 because the booking's status changed since the
     * details screen was loaded - or sends the user to sign in when the login has expired.
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
