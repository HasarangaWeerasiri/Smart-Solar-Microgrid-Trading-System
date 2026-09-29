/*
 * File: ReservationSlotPicker.jsx
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-25
 * Description: Linked fields used by the reservation forms: choose a station, optionally a day,
 *              then one of the station's upcoming open slots. Stations and slots are read live
 *              from the API.
 *
 *              Only active, available, upcoming slots are listed, and the date box narrows them
 *              to one day, to keep the list short. These are display filters only: the API still
 *              checks the 7 day rule, double booking and every other rule when the form is
 *              submitted, and its message is shown.
 */

import { useEffect, useMemo, useState } from 'react'
import { getSlotsByStation } from '../api/slots.js'
import { getStations } from '../api/stations.js'
import { formatRelative, formatTimeRange, toLocalDateKey } from '../utils/reservationFormat.js'

const FIELD_CLASS =
  'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:bg-slate-100 disabled:text-slate-500'

/**
 * Draws the station and slot drop-downs.
 * excludeSlotId hides one slot, used when changing a booking so its current slot is not offered.
 */
export default function ReservationSlotPicker({ stationId, slotId, onStationChange, onSlotChange, excludeSlotId, disabled }) {
  const [stations, setStations] = useState([])
  const [slots, setSlots] = useState([])
  const [isLoadingStations, setIsLoadingStations] = useState(true)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [error, setError] = useState('')

  // Optional day chosen in the date box, as "YYYY-MM-DD". Empty means every upcoming day.
  const [day, setDay] = useState('')

  // The slots actually offered: all open slots, or only those on the chosen day.
  const visibleSlots = useMemo(
    () => (day ? slots.filter((slot) => toLocalDateKey(slot.startTime) === day) : slots),
    [slots, day]
  )

  // Load the active stations once when the form opens.
  useEffect(() => {
    let isActive = true

    /**
     * Reads the stations from the API and keeps only the active ones.
     */
    async function loadStations() {
      try {
        const all = await getStations()
        if (isActive) {
          setStations(all.filter((station) => station.status === 'Active'))
        }
      } catch (loadFailure) {
        if (isActive) {
          setError(loadFailure.message)
        }
      } finally {
        if (isActive) {
          setIsLoadingStations(false)
        }
      }
    }

    loadStations()
    return () => {
      isActive = false
    }
  }, [])

  // Load the chosen station's slots whenever the station changes.
  useEffect(() => {
    let isActive = true

    /**
     * Reads the station's slots from the API and keeps the open, upcoming ones, soonest first.
     */
    async function loadSlots() {
      if (!stationId) {
        setSlots([])
        return
      }

      setIsLoadingSlots(true)
      setError('')

      try {
        const all = await getSlotsByStation(stationId)
        const now = Date.now()
        const open = all
          .filter((slot) => slot.status === 'Active' && slot.isAvailable)
          .filter((slot) => new Date(slot.startTime).getTime() > now)
          .filter((slot) => slot.id !== excludeSlotId)
          .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))

        if (isActive) {
          setSlots(open)
        }
      } catch (loadFailure) {
        if (isActive) {
          setError(loadFailure.message)
          setSlots([])
        }
      } finally {
        if (isActive) {
          setIsLoadingSlots(false)
        }
      }
    }

    loadSlots()
    return () => {
      isActive = false
    }
  }, [stationId, excludeSlotId])

  /**
   * Picks a station and clears the slot, because the old slot belongs to another station.
   */
  function handleStationChange(event) {
    onStationChange(event.target.value)
    onSlotChange('')
  }

  /**
   * Picks a day to narrow the slot list. A chosen slot on another day is cleared, so the form
   * can never submit a slot that is no longer shown.
   */
  function handleDayChange(event) {
    const newDay = event.target.value
    setDay(newDay)

    const chosen = slots.find((slot) => slot.id === slotId)
    if (newDay && chosen && toLocalDateKey(chosen.startTime) !== newDay) {
      onSlotChange('')
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="reservation-station" className="block text-sm font-medium text-slate-700">
          Station
        </label>
        <select
          id="reservation-station"
          value={stationId}
          onChange={handleStationChange}
          disabled={disabled || isLoadingStations}
          required
          className={FIELD_CLASS}
        >
          <option value="">{isLoadingStations ? 'Loading stations...' : 'Choose a station'}</option>
          {stations.map((station) => (
            <option key={station.id} value={station.id}>
              {station.name} - {station.address}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="reservation-day" className="block text-sm font-medium text-slate-700">
          Date <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="reservation-day"
            type="date"
            value={day}
            min={toLocalDateKey(Date.now())}
            onChange={handleDayChange}
            disabled={disabled || !stationId}
            className={FIELD_CLASS.replace('mt-1 ', '')}
          />
          {day && (
            <button
              type="button"
              onClick={() => setDay('')}
              disabled={disabled}
              className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              All dates
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {day
            ? `${visibleSlots.length} open slot${visibleSlots.length === 1 ? '' : 's'} on this day.`
            : 'Leave empty to see every upcoming slot at the station.'}
        </p>
      </div>

      <div>
        <label htmlFor="reservation-slot" className="block text-sm font-medium text-slate-700">
          Slot
        </label>
        <select
          id="reservation-slot"
          value={slotId}
          onChange={(event) => onSlotChange(event.target.value)}
          disabled={disabled || !stationId || isLoadingSlots}
          required
          className={FIELD_CLASS}
        >
          <option value="">
            {!stationId
              ? 'Choose a station first'
              : isLoadingSlots
                ? 'Loading slots...'
                : slots.length === 0
                  ? 'No open slots at this station'
                  : visibleSlots.length === 0
                    ? 'No open slots on this day'
                    : 'Choose a slot'}
          </option>
          {visibleSlots.map((slot) => (
            <option key={slot.id} value={slot.id}>
              {slot.slotName} - {formatTimeRange(slot.startTime, slot.endTime)} ({formatRelative(slot.startTime)})
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Reservations must be within the next 7 days. The server checks this when you save.
        </p>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  )
}
