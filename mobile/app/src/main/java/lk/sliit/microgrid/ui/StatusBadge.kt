/*
 * File: StatusBadge.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-25
 * Description: Colours a TextView as a reservation status pill (Pending, Approved, Completed,
 *              Cancelled), using the same colours as the web app. Shared by every screen that
 *              shows a booking's status.
 */

package lk.sliit.microgrid.ui

import android.content.res.ColorStateList
import android.widget.TextView
import androidx.core.content.ContextCompat
import lk.sliit.microgrid.R

/**
 * Applies the status pill style to a TextView.
 */
object StatusBadge {

    /**
     * Shows the status text on the pill background, coloured for that status.
     */
    fun apply(view: TextView, status: String) {
        val (background, text) = when (status) {
            "Approved" -> R.color.status_approved_bg to R.color.status_approved_text
            "Completed" -> R.color.status_completed_bg to R.color.status_completed_text
            "Cancelled" -> R.color.status_cancelled_bg to R.color.status_cancelled_text
            else -> R.color.status_pending_bg to R.color.status_pending_text
        }

        view.text = status
        view.setBackgroundResource(R.drawable.bg_status_badge)
        view.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(view.context, background))
        view.setTextColor(ContextCompat.getColor(view.context, text))
    }
}
