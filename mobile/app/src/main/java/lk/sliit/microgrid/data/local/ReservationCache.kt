/*
 * File: ReservationCache.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Member D
 * Created: 2026-09-28
 * Description: Saves and reads the prosumer dashboard's last successful API answers in the
 *              local SQLite database - the reservation list (kept per scope) and the summary
 *              counts - so the dashboard has real data to show the instant it opens, and can
 *              still show something when the API cannot be reached. Never the master copy of
 *              anything: it is overwritten every time a fresh answer arrives from the API.
 */

package lk.sliit.microgrid.data.local

import android.content.ContentValues
import android.database.Cursor
import lk.sliit.microgrid.data.model.Reservation
import lk.sliit.microgrid.data.model.ReservationSummary
import android.content.Context

/**
 * Reads and writes the cached_reservations and cached_summary tables.
 */
class ReservationCache(context: Context) {

    // applicationContext is used so holding this class can never leak an Activity.
    private val dbHelper = DbHelper(context.applicationContext)

    /**
     * Replaces the cached list for one scope with a fresh answer from the API. Done inside a
     * transaction, so a screen reading the cache mid-write never sees a half-updated list.
     */
    fun saveList(scope: String, reservations: List<Reservation>) {
        val db = dbHelper.writableDatabase
        db.beginTransaction()
        try {
            db.delete(DbHelper.TABLE_CACHED_RESERVATIONS, "${DbHelper.COLUMN_SCOPE} = ?", arrayOf(scope))

            val cachedAt = System.currentTimeMillis()
            for (reservation in reservations) {
                val values = ContentValues().apply {
                    put(DbHelper.COLUMN_RESERVATION_ID, reservation.id)
                    put(DbHelper.COLUMN_SCOPE, scope)
                    put(DbHelper.COLUMN_PROSUMER_NIC, reservation.prosumerNic)
                    put(DbHelper.COLUMN_PROSUMER_NAME, reservation.prosumerName)
                    put(DbHelper.COLUMN_STATION_ID, reservation.stationId)
                    put(DbHelper.COLUMN_STATION_NAME, reservation.stationName)
                    put(DbHelper.COLUMN_SLOT_ID, reservation.slotId)
                    put(DbHelper.COLUMN_SLOT_NAME, reservation.slotName)
                    put(DbHelper.COLUMN_RESERVATION_START, reservation.reservationStart)
                    put(DbHelper.COLUMN_RESERVATION_END, reservation.reservationEnd)
                    put(DbHelper.COLUMN_RESERVATION_STATUS, reservation.status)
                    put(DbHelper.COLUMN_CAN_MODIFY, if (reservation.canModify) 1 else 0)
                    put(DbHelper.COLUMN_CREATED_AT, reservation.createdAt)
                    put(DbHelper.COLUMN_UPDATED_AT, reservation.updatedAt)
                    put(DbHelper.COLUMN_CACHED_AT, cachedAt)
                }
                db.insertOrThrow(DbHelper.TABLE_CACHED_RESERVATIONS, null, values)
            }

            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    /**
     * Returns the cached list for one scope, latest reservation time first - the same order
     * the API itself answers in. Empty when nothing has been cached for that scope yet.
     */
    fun getList(scope: String): List<Reservation> {
        val cursor = dbHelper.readableDatabase.query(
            DbHelper.TABLE_CACHED_RESERVATIONS,
            null,
            "${DbHelper.COLUMN_SCOPE} = ?",
            arrayOf(scope),
            null,
            null,
            "${DbHelper.COLUMN_RESERVATION_START} DESC"
        )

        val reservations = mutableListOf<Reservation>()
        cursor.use {
            while (it.moveToNext()) {
                reservations.add(readReservation(it))
            }
        }
        return reservations
    }

    /**
     * Saves the summary counts, replacing whatever was cached before. The fixed id of 1 means
     * a later save overwrites the first instead of adding a row, the same trick SessionManager
     * uses for the session table.
     */
    fun saveSummary(summary: ReservationSummary) {
        val values = ContentValues().apply {
            put(DbHelper.COLUMN_ID, 1)
            put(DbHelper.COLUMN_SUMMARY_PENDING, summary.pending)
            put(DbHelper.COLUMN_SUMMARY_APPROVED, summary.approved)
            put(DbHelper.COLUMN_SUMMARY_COMPLETED, summary.completed)
            put(DbHelper.COLUMN_SUMMARY_CANCELLED, summary.cancelled)
            put(DbHelper.COLUMN_SUMMARY_APPROVED_UPCOMING, summary.approvedUpcoming)
            put(DbHelper.COLUMN_CACHED_AT, System.currentTimeMillis())
        }

        dbHelper.writableDatabase.replace(DbHelper.TABLE_CACHED_SUMMARY, null, values)
    }

    /**
     * Returns the cached summary, or null when nothing has been cached yet.
     */
    fun getSummary(): ReservationSummary? {
        val cursor = dbHelper.readableDatabase.query(
            DbHelper.TABLE_CACHED_SUMMARY,
            null,
            "${DbHelper.COLUMN_ID} = ?",
            arrayOf("1"),
            null,
            null,
            null
        )

        cursor.use {
            if (!it.moveToFirst()) {
                return null
            }

            return ReservationSummary(
                pending = it.getInt(it.getColumnIndexOrThrow(DbHelper.COLUMN_SUMMARY_PENDING)),
                approved = it.getInt(it.getColumnIndexOrThrow(DbHelper.COLUMN_SUMMARY_APPROVED)),
                completed = it.getInt(it.getColumnIndexOrThrow(DbHelper.COLUMN_SUMMARY_COMPLETED)),
                cancelled = it.getInt(it.getColumnIndexOrThrow(DbHelper.COLUMN_SUMMARY_CANCELLED)),
                approvedUpcoming = it.getInt(it.getColumnIndexOrThrow(DbHelper.COLUMN_SUMMARY_APPROVED_UPCOMING))
            )
        }
    }

    /**
     * Reads one row of the cached_reservations table into a Reservation.
     */
    private fun readReservation(cursor: Cursor): Reservation {
        fun text(column: String) = cursor.getString(cursor.getColumnIndexOrThrow(column))
        fun optionalText(column: String): String? {
            val index = cursor.getColumnIndexOrThrow(column)
            return if (cursor.isNull(index)) null else cursor.getString(index)
        }

        return Reservation(
            id = text(DbHelper.COLUMN_RESERVATION_ID),
            prosumerNic = text(DbHelper.COLUMN_PROSUMER_NIC),
            prosumerName = optionalText(DbHelper.COLUMN_PROSUMER_NAME),
            stationId = text(DbHelper.COLUMN_STATION_ID),
            stationName = optionalText(DbHelper.COLUMN_STATION_NAME),
            slotId = text(DbHelper.COLUMN_SLOT_ID),
            slotName = optionalText(DbHelper.COLUMN_SLOT_NAME),
            reservationStart = text(DbHelper.COLUMN_RESERVATION_START),
            reservationEnd = text(DbHelper.COLUMN_RESERVATION_END),
            status = text(DbHelper.COLUMN_RESERVATION_STATUS),
            canModify = cursor.getInt(cursor.getColumnIndexOrThrow(DbHelper.COLUMN_CAN_MODIFY)) != 0,
            createdAt = text(DbHelper.COLUMN_CREATED_AT),
            updatedAt = text(DbHelper.COLUMN_UPDATED_AT)
        )
    }
}
