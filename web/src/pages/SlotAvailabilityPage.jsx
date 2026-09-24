import { useEffect, useMemo, useState } from 'react'

import { getStations } from '../api/stations'
import {
  getSlotsByStation,
  updateSlotAvailability
} from '../api/slots'

export default function SlotAvailabilityPage() {
  const [stations, setStations] = useState([])
  const [selectedStationId, setSelectedStationId] = useState('')
  const [slots, setSlots] = useState([])

  const [loadingStations, setLoadingStations] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [updatingSlotId, setUpdatingSlotId] = useState(null)

  const [pageError, setPageError] = useState('')
  const [search, setSearch] = useState('')

 useEffect(() => {
    loadStations()
  }, [])

  useEffect(() => {
    if (selectedStationId) {
      loadSlots(selectedStationId)
    } else {
      setSlots([])
    }
  }, [selectedStationId])

  async function loadStations() {
    setLoadingStations(true)
    setPageError('')

    try {
      const data = await getStations()
      const stationList = Array.isArray(data) ? data : []

      setStations(stationList)

      // Automatically select the first active station
      const firstActiveStation = stationList.find(
        (station) => station.status === 'Active'
      )

      if (firstActiveStation) {
        setSelectedStationId(firstActiveStation.id)
      } else if (stationList.length > 0) {
        setSelectedStationId(stationList[0].id)
      }
    } catch (error) {
      setPageError(error.message || 'Unable to load stations.')
    } finally {
      setLoadingStations(false)
    }
  }

  async function loadSlots(stationId) {
    setLoadingSlots(true)
    setPageError('')

    try {
      const data = await getSlotsByStation(stationId)
      setSlots(Array.isArray(data) ? data : [])
    } catch (error) {
      setPageError(error.message || 'Unable to load booking slots.')
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  async function handleAvailabilityChange(slot) {
    if (slot.status === 'Deactivated') {
      return
    }

    const newAvailability = !slot.isAvailable

    setUpdatingSlotId(slot.id)
    setPageError('')

    try {
      const updatedSlot = await updateSlotAvailability(
        slot.id,
        newAvailability
      )

      // Update only this slot in the UI
      setSlots((currentSlots) =>
        currentSlots.map((currentSlot) =>
          currentSlot.id === slot.id
            ? updatedSlot
            : currentSlot
        )
      )
    } catch (error) {
      setPageError(
        error.message || 'Unable to update slot availability.'
      )
    } finally {
      setUpdatingSlotId(null)
    }
  }

  const selectedStation = useMemo(() => {
    return stations.find(
      (station) => station.id === selectedStationId
    )
  }, [stations, selectedStationId])

  const filteredSlots = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return slots
    }

    return slots.filter((slot) => {
      const availability = slot.isAvailable
        ? 'available'
        : 'unavailable'

      return (
        slot.slotName?.toLowerCase().includes(query) ||
        slot.status?.toLowerCase().includes(query) ||
        availability.includes(query)
      )
    })
  }, [slots, search])

  function formatDateTime(value) {
    if (!value) return '-'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return value
    }

    return date.toLocaleString()
  }

  return (
    <div>
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Slot Availability
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          Manage the operational availability of energy booking
          slots.
        </p>
      </div>

      {/* ERROR */}
      {pageError && (
        <div
          role="alert"
          className="mt-5 flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <div>
            <span className="font-semibold">Error: </span>
            {pageError}
          </div>

          <button
            type="button"
            onClick={() => setPageError('')}
            className="font-semibold text-red-500 hover:text-red-700"
            aria-label="Close error"
          >
            ×
          </button>
        </div>
      )}

      {/* STATION SELECTOR */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">

          <div>
            <label
              htmlFor="station"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Select Microgrid Station
            </label>

            <select
              id="station"
              value={selectedStationId}
              onChange={(event) =>
                setSelectedStationId(event.target.value)
              }
              disabled={loadingStations}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
            >
              <option value="">
                {loadingStations
                  ? 'Loading stations...'
                  : 'Select a station'}
              </option>

              {stations.map((station) => (
                <option
                  key={station.id}
                  value={station.id}
                >
                  {station.name} - {station.status}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              if (selectedStationId) {
                loadSlots(selectedStationId)
              }
            }}
            disabled={
              !selectedStationId ||
              loadingSlots
            }
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingSlots ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* SELECTED STATION INFORMATION */}
      {selectedStation && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">

            {/* SOLAR ICON */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h2 className="font-semibold text-slate-900">
                    {selectedStation.name}
                  </h2>

                  <p className="mt-0.5 text-sm text-slate-500">
                    {selectedStation.address}
                  </p>
                </div>

                <span
                  className={
                    selectedStation.status === 'Active'
                      ? 'inline-flex w-fit rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700'
                      : 'inline-flex w-fit rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700'
                  }
                >
                  {selectedStation.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">

                <div>
                  <p className="text-xs text-slate-400">
                    Capacity
                  </p>

                  <p className="mt-1 font-medium text-slate-700">
                    {selectedStation.capacityKwh} kWh
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Operating Hours
                  </p>

                  <p className="mt-1 font-medium text-slate-700">
                    {selectedStation.operatingStartTime}
                    {' – '}
                    {selectedStation.operatingEndTime}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Latitude
                  </p>

                  <p className="mt-1 font-medium text-slate-700">
                    {selectedStation.latitude}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Longitude
                  </p>

                  <p className="mt-1 font-medium text-slate-700">
                    {selectedStation.longitude}
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH */}
      {selectedStationId && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="relative w-full sm:max-w-md">

            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>

            <input
              type="search"
              placeholder="Search slots..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>
      )}

      {/* SLOT TABLE */}
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            Booking Slot Availability
          </h2>

          <p className="mt-0.5 text-sm text-slate-500">
            {selectedStationId
              ? `${filteredSlots.length} ${
                  filteredSlots.length === 1
                    ? 'slot'
                    : 'slots'
                } found`
              : 'Select a station to view its slots.'}
          </p>
        </div>

        {!selectedStationId ? (
          <div className="px-6 py-16 text-center text-sm text-slate-500">
            Select a microgrid station above.
          </div>
        ) : loadingSlots ? (
          <div className="px-6 py-16 text-center text-sm font-medium text-slate-600">
            Loading booking slots...
          </div>
        ) : filteredSlots.length === 0 ? (
          <div className="px-6 py-16 text-center">

            {/* CLOCK ICON */}
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No booking slots found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {search
                ? 'No slots match your search.'
                : 'This station does not currently have any booking slots.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[850px] text-left">

              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Slot
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Start Time
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    End Time
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Availability
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredSlots.map((slot) => {
                  const isUpdating =
                    updatingSlotId === slot.id

                  const isDeactivated =
                    slot.status === 'Deactivated'

                  return (
                    <tr
                      key={slot.id}
                      className="transition hover:bg-slate-50"
                    >

                      {/* SLOT */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-5 w-5"
                              aria-hidden="true"
                            >
                              <circle
                                cx="12"
                                cy="12"
                                r="9"
                              />
                              <path d="M12 7v5l3 2" />
                            </svg>
                          </div>

                          <div>
                            <p className="font-medium text-slate-900">
                              {slot.slotName}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400">
                              Energy booking slot
                            </p>
                          </div>

                        </div>
                      </td>

                      {/* START */}
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDateTime(slot.startTime)}
                      </td>

                      {/* END */}
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDateTime(slot.endTime)}
                      </td>

                      {/* STATUS */}
                      <td className="px-5 py-4">

                        <span
                          className={
                            slot.status === 'Active'
                              ? 'inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700'
                              : 'inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700'
                          }
                        >
                          {slot.status}
                        </span>

                      </td>

                      {/* AVAILABILITY */}
                      <td className="px-5 py-4">

                        <span
                          className={
                            slot.isAvailable
                              ? 'inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700'
                              : 'inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700'
                          }
                        >
                          <span
                            className={
                              slot.isAvailable
                                ? 'h-1.5 w-1.5 rounded-full bg-emerald-500'
                                : 'h-1.5 w-1.5 rounded-full bg-amber-500'
                            }
                          />

                          {slot.isAvailable
                            ? 'Available'
                            : 'Unavailable'}
                        </span>

                      </td>

                      {/* ACTION */}
                      <td className="px-5 py-4">

                        <div className="flex justify-end">

                          <button
                            type="button"
                            onClick={() =>
                              handleAvailabilityChange(slot)
                            }
                            disabled={
                              isUpdating ||
                              isDeactivated
                            }
                            className={
                              isDeactivated
                                ? 'rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-medium text-slate-400'
                                : slot.isAvailable
                                  ? 'rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50'
                                  : 'rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50'
                            }
                          >
                            {isUpdating
                              ? 'Updating...'
                              : isDeactivated
                                ? 'Deactivated'
                                : slot.isAvailable
                                  ? 'Set Unavailable'
                                  : 'Set Available'}
                          </button>

                        </div>
                      </td>

                    </tr>
                  )
                })}

              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}