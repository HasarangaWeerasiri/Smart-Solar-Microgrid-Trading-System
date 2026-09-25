/*
 * File: ReservationTime.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-25
 * Description: Display helpers for reservation and slot times. The API sends every time in UTC
 *              (for example "2026-09-27T04:55:00Z"); these turn it into the phone's local time
 *              for display only. No booking rule is worked out here.
 *
 *              SimpleDateFormat is used instead of java.time because the app supports Android 7
 *              (API 24), where java.time is not available.
 */

package lk.sliit.microgrid.util

import java.text.ParseException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.math.abs
import kotlin.math.roundToLong

/**
 * Parses and formats the ISO times used by the API.
 */
object ReservationTime {

    // Date and time, optional fraction of a second, optional zone ("Z" or "+05:30").
    private val isoPattern =
        Regex("""^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})?$""")

    /**
     * Reads an API time. A time without a zone is treated as UTC, which is how the API stores
     * every time. Returns null when the text is not a valid time.
     */
    fun parse(value: String?): Date? {
        val match = isoPattern.find(value?.trim().orEmpty()) ?: return null
        val zone = match.groupValues[3]

        val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
        format.timeZone =
            if (zone.isEmpty() || zone == "Z") TimeZone.getTimeZone("UTC") else TimeZone.getTimeZone("GMT$zone")

        return try {
            format.parse(match.groupValues[1])
        } catch (exception: ParseException) {
            null
        }
    }

    /**
     * Shows a date and time in local time, for example "Sat, 27 Sep, 10:25 AM".
     */
    fun formatDateTime(value: String?): String {
        val date = parse(value) ?: return "-"
        return SimpleDateFormat("EEE, d MMM, h:mm a", Locale.getDefault()).format(date)
    }

    /**
     * Shows a slot's window, for example "Sat, 27 Sep, 10:25 AM - 11:25 AM".
     */
    fun formatRange(start: String?, end: String?): String {
        val endDate = parse(end) ?: return formatDateTime(start)
        val endText = SimpleDateFormat("h:mm a", Locale.getDefault()).format(endDate)
        return "${formatDateTime(start)} - $endText"
    }

    /**
     * Says roughly how far away a time is, for example "in 2 days", "in 5 hours" or "3 hours ago".
     */
    fun formatRelative(value: String?): String {
        val date = parse(value) ?: return ""
        val minutes = ((date.time - System.currentTimeMillis()) / 60000.0).roundToLong()
        val absolute = abs(minutes)

        val amount = when {
            absolute < 60 -> plural(absolute, "minute")
            absolute < 60 * 48 -> plural((absolute / 60.0).roundToLong(), "hour")
            else -> plural((absolute / (60 * 24.0)).roundToLong(), "day")
        }

        return if (minutes >= 0) "in $amount" else "$amount ago"
    }

    /**
     * Returns the local calendar day of a time as "yyyy-MM-dd", used by the date filter.
     */
    fun localDayKey(date: Date): String {
        return SimpleDateFormat("yyyy-MM-dd", Locale.US).format(date)
    }

    /**
     * Shows a local day for the date button, for example "Sat, 27 Sep".
     */
    fun formatDay(date: Date): String {
        return SimpleDateFormat("EEE, d MMM", Locale.getDefault()).format(date)
    }

    /**
     * Joins a number and a word, adding "s" when needed: "1 hour", "5 hours".
     */
    private fun plural(count: Long, word: String): String {
        return if (count == 1L) "1 $word" else "$count ${word}s"
    }
}
