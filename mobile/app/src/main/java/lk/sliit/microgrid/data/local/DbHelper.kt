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
        private const val DATABASE_VERSION = 1

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
    }

    /**
     * Runs once, the first time the database file is created on the phone.
     * Other members add their own CREATE TABLE statements here for reference data.
     */
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(CREATE_SESSION_TABLE)
    }

    /**
     * Runs when DATABASE_VERSION is raised and an older database already exists.
     * The session can safely be rebuilt by logging in again, so the table is simply
     * dropped and created fresh.
     */
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_SESSION")
        onCreate(db)
    }
}
