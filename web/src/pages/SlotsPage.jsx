import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import Modal from '../components/Modal'
import SlotForm from '../components/SlotForm'
import StatusBadge from '../components/StatusBadge'

import { getStationById } from '../api/stations'

import {
  getSlotsByStation,
  createSlot,
  updateSlot,
  activateSlot,
  deactivateSlot
} from '../api/slots'

export default function SlotsPage() {
  const { stationId } = useParams()
  const navigate = useNavigate()

  const [station, setStation] = useState(null)
  const [slots, setSlots] = useState([])

  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [search, setSearch] = useState('')

  // Create / Edit
  const [showForm, setShowForm] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Activate / Deactivate
  const [confirmSlot, setConfirmSlot] = useState(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState('')

  const loadPage = useCallback(async () => {
    setLoading(true)
    setPageError('')

    try {
      const [stationData, slotData] = await Promise.all([
        getStationById(stationId),
        getSlotsByStation(stationId)
      ])

      setStation(stationData)
      setSlots(Array.isArray(slotData) ? slotData : [])
    } catch (error) {
      setPageError(
        error.message || 'Unable to load booking slots.'
      )
    } finally {
      setLoading(false)
    }
  }, [stationId])

  useEffect(() => {
    loadPage()
  }, [loadPage])

  function openCreateModal() {
    setSelectedSlot(null)
    setFormError('')
    setShowForm(true)
  }

  function openEditModal(slot) {
    setSelectedSlot(slot)
    setFormError('')
    setShowForm(true)
  }

  function closeFormModal() {
    if (saving) return

    setShowForm(false)
    setSelectedSlot(null)
    setFormError('')
  }

  async function handleSlotSubmit(slotData) {
    setSaving(true)
    setFormError('')

    try {
      if (selectedSlot) {
        await updateSlot(selectedSlot.id, slotData)
      } else {
        await createSlot(stationId, slotData)
      }

      setShowForm(false)
      setSelectedSlot(null)

      await loadPage()
    } catch (error) {
      setFormError(
        error.message || 'Unable to save booking slot.'
      )
    } finally {
      setSaving(false)
    }
  }

  function requestStatusChange(slot) {
    setStatusError('')
    setConfirmSlot(slot)
  }

  function closeStatusModal() {
    if (statusLoading) return

    setConfirmSlot(null)
    setStatusError('')
  }

  async function handleStatusChange() {
    if (!confirmSlot) return

    setStatusLoading(true)
    setStatusError('')

    try {
      if (confirmSlot.status === 'Active') {
        await deactivateSlot(confirmSlot.id)
      } else {
        await activateSlot(confirmSlot.id)
      }

      setConfirmSlot(null)
      await loadPage()
    } catch (error) {
      setStatusError(
        error.message ||
          'Unable to update booking slot status.'
      )
    } finally {
      setStatusLoading(false)
    }
  }

  const filteredSlots = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return slots

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
      {/* BACK LINK */}
      <button
        type="button"
        onClick={() => navigate('/backoffice/stations')}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
      >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>

        <span>Back to Stations</span>
        
      </button>

      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Booking Slots
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            {station ? (
              <>
                Manage booking slots for{' '}
                <span className="font-medium text-slate-800">
                  {station.name}
                </span>
                .
              </>
            ) : (
              'Manage energy booking slots.'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          disabled={
            !station ||
            station.status === 'Deactivated' ||
            loading
          }
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="mr-2 text-lg leading-none">+</span>
          Add Slot
        </button>
      </div>

      {/* PAGE ERROR */}
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
          >
            ×
          </button>
        </div>
      )}

      {/* STATION SUMMARY */}
      {station && (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
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
                <h2 className="font-semibold text-slate-900">
                  {station.name}
                </h2>

                <p className="text-sm text-slate-500">
                  {station.address}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 px-5 py-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Capacity
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {station.capacityKwh} kWh
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Operating Hours
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {station.operatingStartTime} –{' '}
                {station.operatingEndTime}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Latitude
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {station.latitude}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Longitude
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {station.longitude}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                Status
              </p>

              <StatusBadge value={station.status} />
            </div>
          </div>
        </div>
      )}

      {/* DEACTIVATED STATION WARNING */}
      {station?.status === 'Deactivated' && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">
            Station deactivated.
          </span>{' '}
          New booking slots cannot be created until this
          station is activated again.
        </div>
      )}

      {/* TOOLBAR */}
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
            placeholder="Search slots by name, status or availability..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <button
          type="button"
          onClick={loadPage}
          disabled={loading}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* SLOT TABLE */}
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            Station Booking Slots
          </h2>

          <p className="mt-0.5 text-sm text-slate-500">
            {filteredSlots.length}{' '}
            {filteredSlots.length === 1
              ? 'slot'
              : 'slots'}{' '}
            found
          </p>
        </div>

        {loading ? (
          <div className="px-6 py-16 text-center text-sm font-medium text-slate-600">
            Loading booking slots...
          </div>
        ) : filteredSlots.length === 0 ? (
          <div className="px-6 py-16 text-center">
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
                ? 'No booking slots match your search.'
                : 'No booking slots have been created for this station yet.'}
            </p>

            {!search &&
              station?.status === 'Active' && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  + Add First Slot
                </button>
              )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
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
                    Availability
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
                {filteredSlots.map((slot) => (
                  <tr
                    key={slot.id}
                    className="transition hover:bg-slate-50"
                  >
                    {/* SLOT NAME */}
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
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 7v5l3 2" />
                            </svg>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-slate-900">
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

                    {/* AVAILABILITY */}
                    <td className="px-5 py-4">
                      {slot.isAvailable ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                          Unavailable
                        </span>
                      )}
                    </td>

                    {/* STATUS */}
                    <td className="px-5 py-4">
                      <StatusBadge value={slot.status} />
                    </td>

                    {/* ACTIONS */}
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(slot)
                          }
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            requestStatusChange(slot)
                          }
                          className={
                            slot.status === 'Active'
                              ? 'rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100'
                              : 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100'
                          }
                        >
                          {slot.status === 'Active'
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

      {/* CREATE / EDIT SLOT */}
      {showForm && (
        <Modal
          title={
            selectedSlot
              ? 'Edit Booking Slot'
              : 'Add Booking Slot'
          }
          description={
            selectedSlot
              ? 'Update the booking slot details.'
              : `Create a new booking slot for ${
                  station?.name || 'this station'
                }.`
          }
          onClose={closeFormModal}
        >
          <SlotForm
            slot={selectedSlot}
            onSubmit={handleSlotSubmit}
            onCancel={closeFormModal}
            loading={saving}
            error={formError}
          />
        </Modal>
      )}

      {/* STATUS CONFIRMATION */}
      {confirmSlot && (
        <Modal
          title={
            confirmSlot.status === 'Active'
              ? 'Deactivate Booking Slot'
              : 'Activate Booking Slot'
          }
          description={
            confirmSlot.status === 'Active'
              ? 'The slot will be disabled and made unavailable.'
              : 'The booking slot will become active again.'
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
                  confirmSlot.status === 'Active'
                    ? 'rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50'
                    : 'rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50'
                }
              >
                {statusLoading
                  ? 'Updating...'
                  : confirmSlot.status === 'Active'
                    ? 'Deactivate'
                    : 'Activate'}
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-700">
            Are you sure you want to{' '}
            {confirmSlot.status === 'Active'
              ? 'deactivate'
              : 'activate'}{' '}
            <strong>{confirmSlot.slotName}</strong>?
          </p>

          {confirmSlot.status === 'Active' && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              Deactivating this slot will also make it
              unavailable for booking.
            </div>
          )}

          {confirmSlot.status === 'Deactivated' && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
              Activating the slot will not automatically
              change its availability. A Grid Operator can
              manage operational availability separately.
            </div>
          )}

          {statusError && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              <span className="font-semibold">
                Error:{' '}
              </span>
              {statusError}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}