import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Modal from '../components/Modal'
import StationForm from '../components/StationForm'
import StatusBadge from '../components/StatusBadge'

import {
  getStations,
  createStation,
  updateStation,
  activateStation,
  deactivateStation
} from '../api/stations'

export default function StationsPage() {
  const navigate = useNavigate()

  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [selectedStation, setSelectedStation] = useState(null)
  const [saving, setSaving] = useState(false)

  const [confirmStation, setConfirmStation] = useState(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState('')

  useEffect(() => {
    loadStations()
  }, [])

  async function loadStations() {
    setLoading(true)
    setPageError('')

    try {
      const data = await getStations()
      setStations(Array.isArray(data) ? data : [])
    } catch (error) {
      setPageError(error.message || 'Unable to load stations.')
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setSelectedStation(null)
    setFormError('')
    setShowForm(true)
  }

  function openEditModal(station) {
    setSelectedStation(station)
    setFormError('')
    setShowForm(true)
  }

  function closeFormModal() {
    if (saving) return

    setShowForm(false)
    setSelectedStation(null)
    setFormError('')
  }

  async function handleStationSubmit(stationData) {
    setSaving(true)
    setFormError('')

    try {
      if (selectedStation) {
        await updateStation(selectedStation.id, stationData)
      } else {
        await createStation(stationData)
      }

      setShowForm(false)
      setSelectedStation(null)

      await loadStations()
    } catch (error) {
      setFormError(error.message || 'Unable to save station.')
    } finally {
      setSaving(false)
    }
  }

  function requestStatusChange(station) {
    setStatusError('')
    setConfirmStation(station)
  }

  function closeStatusModal() {
    if (statusLoading) return

    setConfirmStation(null)
    setStatusError('')
  }

  async function handleStatusChange() {
    if (!confirmStation) return

    setStatusLoading(true)
    setStatusError('')

    try {
      if (confirmStation.status === 'Active') {
        await deactivateStation(confirmStation.id)
      } else {
        await activateStation(confirmStation.id)
      }

      setConfirmStation(null)
      await loadStations()
    } catch (error) {
      setStatusError(
        error.message || 'Unable to update station status.'
      )
    } finally {
      setStatusLoading(false)
    }
  }

  function openSlots(station) {
    navigate(`/backoffice/stations/${station.id}/slots`)
  }

  const filteredStations = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return stations

    return stations.filter((station) => {
      return (
        station.name?.toLowerCase().includes(query) ||
        station.address?.toLowerCase().includes(query) ||
        station.status?.toLowerCase().includes(query)
      )
    })
  }, [stations, search])

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Microgrid Stations
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Manage solar microgrid stations, GPS locations, capacity and
            operating schedules.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          <span className="mr-2 text-lg leading-none">+</span>
          Add Station
        </button>
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

      {/* SEARCH / TOOLBAR */}
      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
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
            placeholder="Search by station, address or status..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <button
          type="button"
          onClick={loadStations}
          disabled={loading}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* TABLE CARD */}
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Table title */}
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Registered Stations
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                {filteredStations.length}{' '}
                {filteredStations.length === 1 ? 'station' : 'stations'} found
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-16 text-center">
            <div className="text-sm font-medium text-slate-600">
              Loading stations...
            </div>
          </div>
        ) : filteredStations.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
              &#9728;
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No stations found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {search
                ? 'No stations match your search.'
                : 'No microgrid stations have been registered yet.'}
            </p>

            {!search && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                + Add First Station
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Station
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Location
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    GPS
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Capacity
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Operating Hours
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredStations.map((station) => (
                  <tr
                    key={station.id}
                    className="transition hover:bg-slate-50"
                  >
                    {/* STATION */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
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

                        <div>
                          <p className="font-medium text-slate-900">
                            {station.name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            Solar microgrid
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* LOCATION */}
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {station.address}
                    </td>

                    {/* GPS */}
                    <td className="px-5 py-4">
                      <div className="text-xs text-slate-600">
                        <div>Lat: {station.latitude}</div>
                        <div className="mt-1">
                          Lng: {station.longitude}
                        </div>
                      </div>
                    </td>

                    {/* CAPACITY */}
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-slate-800">
                        {station.capacityKwh}
                      </span>

                      <span className="ml-1 text-xs text-slate-500">
                        kWh
                      </span>
                    </td>

                    {/* OPERATING HOURS */}
                    <td className="px-5 py-4">
                      <div className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {station.operatingStartTime}
                        <span className="mx-1.5 text-slate-400">–</span>
                        {station.operatingEndTime}
                      </div>
                    </td>

                    {/* STATUS */}
                    <td className="px-5 py-4">
                      <StatusBadge value={station.status} />
                    </td>

                    {/* ACTIONS */}
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(station)}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => openSlots(station)}
                          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
                        >
                          Slots
                        </button>

                        <button
                          type="button"
                          onClick={() => requestStatusChange(station)}
                          className={
                            station.status === 'Active'
                              ? 'rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100'
                              : 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100'
                          }
                        >
                          {station.status === 'Active'
                            ? 'Deactivate'
                            : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {showForm && (
        <Modal
          title={selectedStation ? 'Edit Station' : 'Add Station'}
          description={
            selectedStation
              ? 'Update the station information, GPS location, capacity and operating schedule.'
              : 'Register a new solar microgrid station.'
          }
          onClose={closeFormModal}
        >
          <StationForm
            station={selectedStation}
            onSubmit={handleStationSubmit}
            onCancel={closeFormModal}
            loading={saving}
            error={formError}
          />
        </Modal>
      )}

      {/* ACTIVATE / DEACTIVATE MODAL */}
      {confirmStation && (
        <Modal
          title={
            confirmStation.status === 'Active'
              ? 'Deactivate Station'
              : 'Activate Station'
          }
          description={
            confirmStation.status === 'Active'
              ? 'The station will no longer be active.'
              : 'The station will become active again.'
          }
          onClose={closeStatusModal}
          footer={
            <>
              <button
                type="button"
                onClick={closeStatusModal}
                disabled={statusLoading}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleStatusChange}
                disabled={statusLoading}
                className={
                  confirmStation.status === 'Active'
                    ? 'rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50'
                    : 'rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50'
                }
              >
                {statusLoading
                  ? 'Updating...'
                  : confirmStation.status === 'Active'
                    ? 'Deactivate'
                    : 'Activate'}
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-700">
            Are you sure you want to{' '}
            {confirmStation.status === 'Active'
              ? 'deactivate'
              : 'activate'}{' '}
            <strong>{confirmStation.name}</strong>?
          </p>

          {confirmStation.status === 'Active' && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              Deactivating this station will prevent new booking slots
              from being created until the station is activated again.
            </div>
          )}

          {statusError && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              <span className="font-semibold">Error: </span>
              {statusError}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}