/*
 * File: QrScannerActivity.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Member D
 * Created: 2026-09-28
 * Description: The Grid Operator's QR scanner. A CameraX preview feeds each frame to ML Kit's
 *              barcode scanner; the first QR code read stops the camera immediately (an
 *              AtomicBoolean guard means it can only fire once) and is sent to
 *              POST /api/reservations/verify-qr - read-only, it never changes the booking.
 *              Only a separate, explicit tap on "Complete transfer" calls
 *              POST /api/reservations/{id}/complete. Verifying and completing stay two
 *              distinct steps the whole way through this screen.
 *
 *              Screen states (exactly one group visible at a time): camera permission needed,
 *              scanning, verifying, verified (with the Complete button), completed, and error.
 */

package lk.sliit.microgrid.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import lk.sliit.microgrid.R
import lk.sliit.microgrid.data.local.SessionManager
import lk.sliit.microgrid.data.model.VerifiedBooking
import lk.sliit.microgrid.data.remote.ApiException
import lk.sliit.microgrid.data.remote.ReservationApi
import lk.sliit.microgrid.util.ReservationTime
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class QrScannerActivity : NetworkPermissionActivity() {

    /**
     * Exactly one of these is shown at a time; showState hides the rest.
     */
    private enum class State { PERMISSION, SCANNING, VERIFYING, VERIFIED, COMPLETED, ERROR }

    private lateinit var permissionGroup: LinearLayout
    private lateinit var scannerGroup: LinearLayout
    private lateinit var verifyingGroup: LinearLayout
    private lateinit var verifiedGroup: LinearLayout
    private lateinit var completedGroup: LinearLayout
    private lateinit var errorGroup: LinearLayout

    private lateinit var previewView: PreviewView
    private lateinit var errorText: TextView
    private lateinit var completeButton: Button
    private lateinit var scanAgainButton: Button

    // Used to move back to the main thread after a network call or a barcode result arrives.
    private val mainHandler = Handler(Looper.getMainLooper())
    private val cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    private val barcodeScanner = BarcodeScanning.getClient(
        BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build()
    )

    // Guarantees the first successful frame wins and every later frame is ignored, even if a
    // few were already in flight on the camera executor when it flipped to true.
    private val hasScanned = AtomicBoolean(false)

    private var cameraProvider: ProcessCameraProvider? = null
    private var token = ""
    private var verified: VerifiedBooking? = null

    private val cameraPermissionRequest =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) startScanning() else showState(State.PERMISSION)
        }

    /**
     * Checks the session and wires up every view. Scanning starts in onResume once the
     * camera permission is confirmed.
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_qr_scanner)

        val savedToken = SessionManager(this).getToken()
        if (savedToken == null) {
            ApiFailure.openLogin(this)
            return
        }
        token = savedToken

        bindViews()
        wireListeners()
    }

    /**
     * Starts (or restarts) the camera whenever the screen comes into view, provided the
     * permission is already granted; otherwise shows the permission screen.
     */
    override fun onResume() {
        super.onResume()
        if (token.isEmpty()) return

        if (hasCameraPermission()) {
            startScanning()
        } else {
            showState(State.PERMISSION)
        }
    }

    /**
     * Releases the camera when the screen is not visible, so it is not left running in the
     * background.
     */
    override fun onPause() {
        super.onPause()
        stopCamera()
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
        barcodeScanner.close()
    }

    /**
     * Finds every view once, matching the rest of the app's one-block-in-onCreate pattern.
     */
    private fun bindViews() {
        permissionGroup = findViewById(R.id.group_permission)
        scannerGroup = findViewById(R.id.group_scanner)
        verifyingGroup = findViewById(R.id.group_verifying)
        verifiedGroup = findViewById(R.id.group_verified)
        completedGroup = findViewById(R.id.group_completed)
        errorGroup = findViewById(R.id.group_error)

        previewView = findViewById(R.id.preview_camera)
        errorText = findViewById(R.id.text_scanner_error)
        completeButton = findViewById(R.id.button_complete_transfer)
        scanAgainButton = findViewById(R.id.button_scan_again)
    }

    /**
     * Connects every button. Try again, Scan a different code and Scan next code all do the
     * same thing: reset back to scanning.
     */
    private fun wireListeners() {
        findViewById<Button>(R.id.button_grant_camera_permission).setOnClickListener {
            cameraPermissionRequest.launch(Manifest.permission.CAMERA)
        }
        findViewById<Button>(R.id.button_try_again).setOnClickListener { resetToScanning() }
        findViewById<Button>(R.id.button_scan_next).setOnClickListener { resetToScanning() }
        scanAgainButton.setOnClickListener { resetToScanning() }
        completeButton.setOnClickListener { completeTransfer() }
    }

    private fun hasCameraPermission(): Boolean =
        ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED

    /**
     * Clears the last result and goes back to a fresh scan, ready for the next booking.
     */
    private fun resetToScanning() {
        verified = null
        hasScanned.set(false)
        if (hasCameraPermission()) startScanning() else showState(State.PERMISSION)
    }

    /**
     * Shows the camera preview and (re)binds CameraX's use cases to it.
     */
    private fun startScanning() {
        showState(State.SCANNING)
        hasScanned.set(false)

        val providerFuture = ProcessCameraProvider.getInstance(this)
        providerFuture.addListener(
            {
                val provider = providerFuture.get()
                cameraProvider = provider
                bindCameraUseCases(provider)
            },
            ContextCompat.getMainExecutor(this)
        )
    }

    /**
     * Wires the camera preview and a frame analyzer to this screen's lifecycle, so CameraX
     * starts and stops the camera automatically as the Activity resumes and pauses.
     */
    private fun bindCameraUseCases(provider: ProcessCameraProvider) {
        val preview = Preview.Builder().build().also { it.surfaceProvider = previewView.surfaceProvider }

        val analysis = ImageAnalysis.Builder()
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build()
        analysis.setAnalyzer(cameraExecutor) { imageProxy -> processFrame(imageProxy) }

        try {
            provider.unbindAll()
            provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
        } catch (exception: Exception) {
            mainHandler.post { showError(getString(R.string.error_request_failed)) }
        }
    }

    /**
     * Runs on the camera executor for every frame. Ignores every frame once one has already
     * been accepted, decodes the frame for a QR code, and - on the first successful read -
     * stops the camera before handing the value back to the main thread.
     *
     * ImageProxy.image is CameraX's own experimental accessor for the underlying frame.
     */
    private fun processFrame(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage == null || hasScanned.get()) {
            imageProxy.close()
            return
        }

        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
        barcodeScanner.process(image)
            .addOnSuccessListener { barcodes ->
                val value = barcodes.firstOrNull()?.rawValue
                if (value != null && hasScanned.compareAndSet(false, true)) {
                    stopCamera()
                    mainHandler.post { onCodeScanned(value) }
                }
            }
            .addOnCompleteListener { imageProxy.close() }
    }

    /**
     * Unbinds every CameraX use case, which stops the preview and frame delivery.
     */
    private fun stopCamera() {
        cameraProvider?.unbindAll()
    }

    /**
     * Handles one scanned code: a quick shape check catches an obviously non-Microgrid QR code
     * (for example a URL) without a network round trip; anything that could plausibly be a
     * token is sent to the API, which is the real authority on whether it is valid.
     */
    private fun onCodeScanned(rawValue: String) {
        if (!looksLikeQrToken(rawValue)) {
            showError(getString(R.string.scanner_not_microgrid_code))
            return
        }
        verifyToken(rawValue)
    }

    /**
     * True when the scanned text has the shape of a Microgrid QR token: two non-empty parts
     * separated by one ".". This is only a fast pre-filter for a friendlier message; the
     * server's own check is what actually decides whether the token is genuine.
     */
    private fun looksLikeQrToken(value: String): Boolean {
        val parts = value.split(".")
        return parts.size == 2 && parts[0].isNotBlank() && parts[1].isNotBlank()
    }

    /**
     * Sends the scanned token to the API on a background thread. Read-only: whatever the
     * result, the booking itself is never changed by this call.
     */
    private fun verifyToken(rawValue: String) {
        showState(State.VERIFYING)

        withLocalNetworkPermission {
            Thread {
                try {
                    val booking = ReservationApi.verifyQr(rawValue, token)
                    mainHandler.post {
                        if (isFinishing || isDestroyed) return@post
                        verified = booking
                        showVerified(booking)
                    }
                } catch (exception: ApiException) {
                    mainHandler.post { handleFailure(exception) }
                }
            }.start()
        }
    }

    /**
     * Fills in the verified booking card and enables the Complete transfer button.
     */
    private fun showVerified(booking: VerifiedBooking) {
        showState(State.VERIFIED)

        findViewById<TextView>(R.id.value_verify_prosumer).text = booking.prosumerFullName ?: "-"
        findViewById<TextView>(R.id.value_verify_nic).text = booking.prosumerNic
        findViewById<TextView>(R.id.value_verify_station).text = booking.stationName ?: "-"
        findViewById<TextView>(R.id.value_verify_slot).text = booking.slotName ?: "-"
        findViewById<TextView>(R.id.value_verify_start).text = ReservationTime.formatDateTime(booking.startTime)
        findViewById<TextView>(R.id.value_verify_end).text = ReservationTime.formatDateTime(booking.endTime)
        StatusBadge.apply(findViewById(R.id.value_verify_status), booking.status)

        completeButton.isEnabled = true
        completeButton.text = getString(R.string.complete_transfer)
        scanAgainButton.isEnabled = true
    }

    /**
     * The only place that calls ReservationApi.complete - a separate, explicit step from
     * verifying. Disables both buttons while the call is in flight so it cannot double-submit.
     */
    private fun completeTransfer() {
        val booking = verified ?: return
        completeButton.isEnabled = false
        completeButton.text = getString(R.string.completing)
        scanAgainButton.isEnabled = false

        withLocalNetworkPermission {
            Thread {
                try {
                    ReservationApi.complete(booking.reservationId, token)
                    mainHandler.post {
                        if (isFinishing || isDestroyed) return@post
                        showState(State.COMPLETED)
                    }
                } catch (exception: ApiException) {
                    mainHandler.post {
                        if (isFinishing || isDestroyed) return@post
                        completeButton.isEnabled = true
                        completeButton.text = getString(R.string.complete_transfer)
                        scanAgainButton.isEnabled = true
                        handleFailure(exception)
                    }
                }
            }.start()
        }
    }

    /**
     * Shows an API failure - the API's own message covers the malformed / bad signature /
     * expired / not found / wrong status cases with a distinct message each - or sends the
     * user to sign in when the login itself has expired.
     */
    private fun handleFailure(exception: ApiException) {
        if (isFinishing || isDestroyed) return
        if (ApiFailure.redirectIfSessionExpired(this, exception)) return
        showError(exception.message ?: getString(R.string.error_request_failed))
    }

    private fun showError(message: String) {
        errorText.text = message
        showState(State.ERROR)
    }

    /**
     * Shows the camera permission screen with its own explanation, rather than a generic error.
     */
    override fun onLocalNetworkPermissionDenied() {
        showError(getString(R.string.error_local_network_denied))
    }

    /**
     * Shows exactly the one group matching the given state and hides every other one.
     */
    private fun showState(state: State) {
        permissionGroup.visibility = if (state == State.PERMISSION) View.VISIBLE else View.GONE
        scannerGroup.visibility = if (state == State.SCANNING) View.VISIBLE else View.GONE
        verifyingGroup.visibility = if (state == State.VERIFYING) View.VISIBLE else View.GONE
        verifiedGroup.visibility = if (state == State.VERIFIED) View.VISIBLE else View.GONE
        completedGroup.visibility = if (state == State.COMPLETED) View.VISIBLE else View.GONE
        errorGroup.visibility = if (state == State.ERROR) View.VISIBLE else View.GONE
    }
}
