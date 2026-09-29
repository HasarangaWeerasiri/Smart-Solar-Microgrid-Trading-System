/*
 * File: ReservationAdapter.kt
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Member D
 * Created: 2026-09-28
 * Description: RecyclerView adapter for the prosumer dashboard's booking list. Reuses
 *              item_reservation.xml, the same card MyReservationsActivity already inflates one
 *              at a time into a LinearLayout, so both screens draw a booking identically.
 */

package lk.sliit.microgrid.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import lk.sliit.microgrid.R
import lk.sliit.microgrid.data.model.Reservation
import lk.sliit.microgrid.util.ReservationTime

/**
 * Shows a list of bookings, one item_reservation card per row. Tapping a row notifies
 * onItemClick with that booking.
 */
class ReservationAdapter(
    private val onItemClick: (Reservation) -> Unit
) : RecyclerView.Adapter<ReservationAdapter.ReservationViewHolder>() {

    private var items: List<Reservation> = emptyList()

    /**
     * Replaces the whole list and redraws the RecyclerView. The list always comes from the
     * API (or the cache mirroring it), never filtered or sorted again here.
     */
    fun submitList(reservations: List<Reservation>) {
        items = reservations
        notifyDataSetChanged()
    }

    /**
     * Inflates one item_reservation card.
     */
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ReservationViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_reservation, parent, false)
        return ReservationViewHolder(view)
    }

    /**
     * Fills in one card and wires its click to onItemClick.
     */
    override fun onBindViewHolder(holder: ReservationViewHolder, position: Int) {
        val reservation = items[position]

        holder.station.text = reservation.stationName ?: "-"
        StatusBadge.apply(holder.status, reservation.status)
        holder.slot.text = reservation.slotName ?: "-"
        holder.time.text = ReservationTime.formatRange(reservation.reservationStart, reservation.reservationEnd)
        holder.note.text = ReservationTime.formatRelative(reservation.reservationStart)

        holder.itemView.setOnClickListener { onItemClick(reservation) }
    }

    override fun getItemCount(): Int = items.size

    /**
     * Holds the views of one item_reservation card.
     */
    class ReservationViewHolder(itemView: android.view.View) : RecyclerView.ViewHolder(itemView) {
        val station: TextView = itemView.findViewById(R.id.item_station)
        val status: TextView = itemView.findViewById(R.id.item_status)
        val slot: TextView = itemView.findViewById(R.id.item_slot)
        val time: TextView = itemView.findViewById(R.id.item_time)
        val note: TextView = itemView.findViewById(R.id.item_note)
    }
}
