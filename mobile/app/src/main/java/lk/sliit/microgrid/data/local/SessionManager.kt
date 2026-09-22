/*
 * File: SessionManager.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Saves and reads the logged-in user in the local SQLite database, so closing
 *              and reopening the app does not log the user out. Every screen asks this class
 *              for the token rather than keeping its own copy.
 */

package lk.sliit.microgrid.data.local

import android.content.ContentValues
import android.content.Context
import lk.sliit.microgrid.data.model.LoggedInUser

/**
 * Reads and writes the single row in the session table.
 */
class SessionManager(context: Context) {

    // applicationContext is used so holding this class can never leak an Activity.
    private val dbHelper = DbHelper(context.applicationContext)

    /**
     * Saves the signed-in user, replacing whatever session was stored before.
     * The fixed id of 1 means a second login overwrites the first instead of adding a row.
     */
    fun save(user: LoggedInUser) {
        val values = ContentValues().apply {
            put(DbHelper.COLUMN_ID, 1)
            put(DbHelper.COLUMN_USER_ID, user.userId)
            put(DbHelper.COLUMN_FULL_NAME, user.fullName)
            put(DbHelper.COLUMN_EMAIL, user.email)
            put(DbHelper.COLUMN_ROLE, user.role)
            put(DbHelper.COLUMN_STATUS, user.status)
            put(DbHelper.COLUMN_TOKEN, user.token)
            put(DbHelper.COLUMN_SAVED_AT, System.currentTimeMillis())
        }

        dbHelper.writableDatabase.replace(DbHelper.TABLE_SESSION, null, values)
    }

    /**
     * Returns the saved user, or null when nobody is logged in on this phone.
     */
    fun getUser(): LoggedInUser? {
        val cursor = dbHelper.readableDatabase.query(
            DbHelper.TABLE_SESSION,
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

            val emailIndex = it.getColumnIndexOrThrow(DbHelper.COLUMN_EMAIL)

            return LoggedInUser(
                userId = it.getString(it.getColumnIndexOrThrow(DbHelper.COLUMN_USER_ID)),
                fullName = it.getString(it.getColumnIndexOrThrow(DbHelper.COLUMN_FULL_NAME)),
                email = if (it.isNull(emailIndex)) null else it.getString(emailIndex),
                role = it.getString(it.getColumnIndexOrThrow(DbHelper.COLUMN_ROLE)),
                status = it.getString(it.getColumnIndexOrThrow(DbHelper.COLUMN_STATUS)),
                token = it.getString(it.getColumnIndexOrThrow(DbHelper.COLUMN_TOKEN))
            )
        }
    }

    /**
     * Returns the saved token, or null when nobody is logged in.
     */
    fun getToken(): String? = getUser()?.token

    /**
     * True when a session is stored on this phone.
     */
    fun isLoggedIn(): Boolean = getUser() != null

    /**
     * Deletes the stored session. Used on logout and when the API rejects the token.
     */
    fun clear() {
        dbHelper.writableDatabase.delete(DbHelper.TABLE_SESSION, null, null)
    }
}
