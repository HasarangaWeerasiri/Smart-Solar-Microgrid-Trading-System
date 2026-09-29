/*
 * File: DbHelper.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Opens and creates the app's local SQLite database. Uses SQLiteOpenHelper
 *              directly, which is the plain Android way of working with SQLite - no Room
 *              and no other library, as required by the assignment.
 *
 *              The local database only stores the login session and reference data copied
 *              from the API. It never holds business rules and is never the master copy of
 *              anything: MongoDB on the server is.
 *              (cached_reservations and cached_summary added by Member D, 2026-09-28, so the
 *              prosumer dashboard has something to show immediately on launch and while the
 *              API is unreachable, instead of an empty screen. onUpgrade was rewritten to add
 *              only the tables a version is missing, rather than dropping the session table on
 *              every bump - signing back in on every schema change was never actually needed.)
 */

package lk.sliit.microgrid.data.local

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

/**
 * Creates and upgrades the local SQLite database file.
 */
class DbHelper(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        private const val DATABASE_NAME = "microgrid.db"

        // Increase this number whenever a table changes, so onUpgrade runs on existing phones.
        private const val DATABASE_VERSION = 2

        // Table that remembers who is logged in. It holds at most one row.
        const val TABLE_SESSION = "session"
        const val COLUMN_ID = "id"
        const val COLUMN_USER_ID = "user_id"
        const val COLUMN_FULL_NAME = "full_name"
        const val COLUMN_EMAIL = "email"
        const val COLUMN_ROLE = "role"
        const val COLUMN_STATUS = "status"
        const val COLUMN_TOKEN = "token"
        const val COLUMN_SAVED_AT = "saved_at"

        // The CHECK keeps the id at 1, so the table can never hold two sessions at once.
        private const val CREATE_SESSION_TABLE = """
            CREATE TABLE $TABLE_SESSION (
                $COLUMN_ID INTEGER PRIMARY KEY CHECK ($COLUMN_ID = 1),
                $COLUMN_USER_ID TEXT NOT NULL,
                $COLUMN_FULL_NAME TEXT NOT NULL,
                $COLUMN_EMAIL TEXT,
                $COLUMN_ROLE TEXT NOT NULL,
                $COLUMN_STATUS TEXT NOT NULL,
                $COLUMN_TOKEN TEXT NOT NULL,
                $COLUMN_SAVED_AT INTEGER NOT NULL
            )
        """

        // Last successful GET /api/reservations answer, kept per scope ("current"/"history")
        // so switching tabs offline still shows that tab's own last-known rows rather than
        // whichever tab happened to be fetched most recently.
        const val TABLE_CACHED_RESERVATIONS = "cached_reservations"
        const val COLUMN_RESERVATION_ID = "reservation_id"
        const val COLUMN_SCOPE = "scope"
        const val COLUMN_PROSUMER_NIC = "prosumer_nic"
        const val COLUMN_PROSUMER_NAME = "prosumer_name"
        const val COLUMN_STATION_ID = "station_id"
        const val COLUMN_STATION_NAME = "station_name"
        const val COLUMN_SLOT_ID = "slot_id"
        const val COLUMN_SLOT_NAME = "slot_name"
        const val COLUMN_RESERVATION_START = "reservation_start"
        const val COLUMN_RESERVATION_END = "reservation_end"
        const val COLUMN_RESERVATION_STATUS = "status"
        const val COLUMN_CAN_MODIFY = "can_modify"
        const val COLUMN_CREATED_AT = "created_at"
        const val COLUMN_UPDATED_AT = "updated_at"
        const val COLUMN_CACHED_AT = "cached_at"

        // A reservation is only ever cached under the scope it was fetched for, so the pair
        // is the natural primary key - the same booking can appear in both scope caches.
        private const val CREATE_CACHED_RESERVATIONS_TABLE = """
            CREATE TABLE $TABLE_CACHED_RESERVATIONS (
                $COLUMN_RESERVATION_ID TEXT NOT NULL,
                $COLUMN_SCOPE TEXT NOT NULL,
                $COLUMN_PROSUMER_NIC TEXT NOT NULL,
                $COLUMN_PROSUMER_NAME TEXT,
                $COLUMN_STATION_ID TEXT NOT NULL,
                $COLUMN_STATION_NAME TEXT,
                $COLUMN_SLOT_ID TEXT NOT NULL,
                $COLUMN_SLOT_NAME TEXT,
                $COLUMN_RESERVATION_START TEXT NOT NULL,
                $COLUMN_RESERVATION_END TEXT NOT NULL,
                $COLUMN_RESERVATION_STATUS TEXT NOT NULL,
                $COLUMN_CAN_MODIFY INTEGER NOT NULL,
                $COLUMN_CREATED_AT TEXT NOT NULL,
                $COLUMN_UPDATED_AT TEXT NOT NULL,
                $COLUMN_CACHED_AT INTEGER NOT NULL,
                PRIMARY KEY ($COLUMN_RESERVATION_ID, $COLUMN_SCOPE)
            )
        """

        // Last successful GET /api/reservations/summary answer. One row, like the session table.
        const val TABLE_CACHED_SUMMARY = "cached_summary"
        const val COLUMN_SUMMARY_PENDING = "pending"
        const val COLUMN_SUMMARY_APPROVED = "approved"
        const val COLUMN_SUMMARY_COMPLETED = "completed"
        const val COLUMN_SUMMARY_CANCELLED = "cancelled"
        const val COLUMN_SUMMARY_APPROVED_UPCOMING = "approved_upcoming"

        private const val CREATE_CACHED_SUMMARY_TABLE = """
            CREATE TABLE $TABLE_CACHED_SUMMARY (
                $COLUMN_ID INTEGER PRIMARY KEY CHECK ($COLUMN_ID = 1),
                $COLUMN_SUMMARY_PENDING INTEGER NOT NULL,
                $COLUMN_SUMMARY_APPROVED INTEGER NOT NULL,
                $COLUMN_SUMMARY_COMPLETED INTEGER NOT NULL,
                $COLUMN_SUMMARY_CANCELLED INTEGER NOT NULL,
                $COLUMN_SUMMARY_APPROVED_UPCOMING INTEGER NOT NULL,
                $COLUMN_CACHED_AT INTEGER NOT NULL
            )
        """
    }

    /**
     * Runs once, the first time the database file is created on the phone.
     * Other members add their own CREATE TABLE statements here for reference data.
     */
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(CREATE_SESSION_TABLE)
        db.execSQL(CREATE_CACHED_RESERVATIONS_TABLE)
        db.execSQL(CREATE_CACHED_SUMMARY_TABLE)
    }

    /**
     * Runs when DATABASE_VERSION is raised and an older database already exists. Only adds
     * what a version introduced, so an upgrade never has to sign anyone out or lose data a
     * newer table does not touch.
     */
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        if (oldVersion < 2) {
            db.execSQL(CREATE_CACHED_RESERVATIONS_TABLE)
            db.execSQL(CREATE_CACHED_SUMMARY_TABLE)
        }
    }
}
