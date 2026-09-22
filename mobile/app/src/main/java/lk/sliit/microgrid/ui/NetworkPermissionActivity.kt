/*
 * File: NetworkPermissionActivity.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-23
 * Description: Base class for every screen that calls the Web API. Android 17 blocks apps
 *              from reaching addresses on the local network - including the emulator's
 *              10.0.2.2 and a development PC on the same Wi-Fi - until the user allows it.
 *              Without the permission the request is dropped silently and only fails after
 *              a long timeout, so each screen asks for it before its first call.
 */

package lk.sliit.microgrid.ui

import android.content.pm.PackageManager
import android.os.Build
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import lk.sliit.microgrid.R

/**
 * Handles the local network permission so the screens themselves do not have to.
 */
abstract class NetworkPermissionActivity : AppCompatActivity() {

    companion object {
        // Android 17 (API level 37) introduced the local network permission.
        private const val ANDROID_17 = 37
        private const val LOCAL_NETWORK_PERMISSION = "android.permission.ACCESS_LOCAL_NETWORK"
    }

    // The work waiting for the user's answer to the permission pop-up.
    private var pendingAction: (() -> Unit)? = null

    // Shows Android's permission pop-up and runs the waiting work once it is allowed.
    private val permissionRequest =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            val action = pendingAction
            pendingAction = null

            if (granted) {
                action?.invoke()
            } else {
                onLocalNetworkPermissionDenied()
            }
        }

    /**
     * Runs the given work, asking for the local network permission first when it is needed.
     * Call this around anything that talks to the API.
     */
    protected fun withLocalNetworkPermission(action: () -> Unit) {
        if (!isPermissionNeeded()) {
            action()
            return
        }

        pendingAction = action
        permissionRequest.launch(LOCAL_NETWORK_PERMISSION)
    }

    /**
     * True on Android 17 or newer when the permission has not been granted yet.
     * Older versions have no such permission and need nothing.
     */
    private fun isPermissionNeeded(): Boolean {
        if (Build.VERSION.SDK_INT < ANDROID_17) {
            return false
        }

        return ContextCompat.checkSelfPermission(this, LOCAL_NETWORK_PERMISSION) !=
            PackageManager.PERMISSION_GRANTED
    }

    /**
     * Called when the user refuses the permission. Screens override this to show the
     * message in their own error area; the default is a short pop-up message.
     */
    protected open fun onLocalNetworkPermissionDenied() {
        Toast.makeText(this, R.string.error_local_network_denied, Toast.LENGTH_LONG).show()
    }
}
