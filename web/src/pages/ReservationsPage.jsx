/*
 * File: ReservationsPage.jsx
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-25
 * Description: Energy slot reservation management for Backoffice and Grid Operator staff.
 *              Staff list, filter and search bookings, create a booking for a prosumer, move a
 *              booking to another slot, cancel it, and approve it. After each action a summary
 *              of the saved booking is shown.
 *
 *              Business rules 5 and 6 (7 day and 12 hour rules), double booking and approval
 *              are enforced by the API only. This page shows the API's message when it refuses,
 *              and uses the API's canModify flag to decide which buttons to offer.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { listProsumers } from '../api/prosumers.js'
import {
  approveReservation,
  cancelReservation,
  createReservation,
  listReservations,
  updateReservation
} from '../api/reservations.js'
import { getStations } from '../api/stations.js'
import Modal from '../components/Modal.jsx'
import ReservationSlotPicker from '../components/ReservationSlotPicker.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { ROLES } from '../roles.js'
import { formatDateTime, formatRelative, formatTimeRange } from '../utils/reservationFormat.js'

const STATUSES = ['Pending', 'Approved', 'Completed', 'Cancelled']

const EMPTY_FORM = { nic: '', stationId: '', slotId: '' }

const FIELD_CLASS =
  'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200'

const SECONDARY_BUTTON =
  'rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100'

// Wording for each action, used in the dialogs and in the summary after saving.
const ACTIONS = {
  create: { title: 'New reservation', done: 'Reservation created' },
  change: { title: 'Change slot', done: 'Reservation moved to a new slot' },
  cancel: { title: 'Cancel reservation', done: 'Reservation cancelled' },
  approve: { title: 'Approve reservation', done: 'Reservation approved' }
}

/**
 * The reservation management screen.
 */
export default function ReservationsPage() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const approvalsPath = `${pathname.replace(/\/$/, '')}/approvals`

  const [reservations, setReservations] = useState([])
  const [stations, setStations] = useState([])
  const [prosumers, setProsumers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState({ status: '', stationId: '' })
  const [search, setSearch] = useState('')

  // The open dialog: { mode: 'create' | 'change' | 'cancel' | 'approve', reservation }.
  const [dialog, setDialog] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [isWorking, setIsWorking] = useState(false)

  // Summary of the last successful action: { heading, reservation }.
  const [summary, setSummary] = useState(null)

  // Number of the newest list request. When a filter changes while an older request is still
  // running, the older answer arrives late and must not replace the newer list.
  const latestRequest = useRef(0)

  /**
   * Loads the reservations for the chosen status and station, read live from the API.
   * Only the answer to the newest request is shown.
   */
  const loadReservations = useCallback(async () => {
    const requestId = ++latestRequest.current
    setIsLoading(true)
    setError('')

    try {
      const result = await listReservations(filters)
      if (requestId === latestRequest.current) {
        setReservations(result)
      }
    } catch (loadFailure) {
      if (requestId === latestRequest.current) {
        setError(loadFailure.message)
      }
    } finally {
      if (requestId === latestRequest.current) {
        setIsLoading(false)
      }
    }
  }, [filters])

  useEffect(() => {
    loadReservations()
  }, [loadReservations])

  // Stations for the filter drop-down, and, for Backoffice only, the active prosumers so the
  // NIC box can suggest them. Grid Operators may not list prosumers, so they type the NIC.
  useEffect(() => {
    getStations().then(setStations).catch(() => setStations([]))

    if (user?.role === ROLES.BACKOFFICE) {
      listProsumers({ status: 'Active' }).then(setProsumers).catch(() => setProsumers([]))
    }
  }, [user?.role])

  // The search box filters the loaded list by NIC, name, station or slot.
  const visibleReservations = useMemo(() => {
    const text = search.trim().toLowerCase()
    if (!text) {
      return reservations
    }

    return reservations.filter((reservation) =>
      [reservation.prosumerNic, reservation.prosumerName, reservation.stationName, reservation.slotName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(text))
    )
  }, [reservations, search])

  /**
   * Changes one filter; the list reloads from the API automatically.
   */
  function handleFilterChange(event) {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  /**
   * Opens a dialog. The change form starts on the booking's current station.
   */
  function openDialog(mode, reservation = null) {
    setForm(mode === 'change' ? { ...EMPTY_FORM, stationId: reservation.stationId } : EMPTY_FORM)
    setFormError('')
    setDialog({ mode, reservation })
  }

  /**
   * Closes the dialog unless a request is still running.
   */
  function closeDialog() {
    if (!isWorking) {
      setDialog(null)
    }
  }

  /**
   * Sends the dialog's action to the API. On success the dialog closes, a summary of the saved
   * booking is shown and the list reloads. On failure the API's message stays in the dialog.
   */
  async function handleConfirm(event) {
    event?.preventDefault()
    setIsWorking(true)
    setFormError('')

    try {
      let saved
      if (dialog.mode === 'create') {
        saved = await createReservation({ nic: form.nic.trim(), slotId: form.slotId })
      } else if (dialog.mode === 'change') {
        saved = await updateReservation(dialog.reservation.id, { slotId: form.slotId })
      } else if (dialog.mode === 'cancel') {
        saved = await cancelReservation(dialog.reservation.id)
      } else {
        saved = await approveReservation(dialog.reservation.id)
      }

      setSummary({ heading: ACTIONS[dialog.mode].done, reservation: saved })
      setDialog(null)
      await loadReservations()
    } catch (actionFailure) {
      setFormError(actionFailure.message)
    } finally {
      setIsWorking(false)
    }
  }

  const needsForm = dialog?.mode === 'create' || dialog?.mode === 'change'

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reservations</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create, change, cancel and approve energy slot bookings for prosumers.
          </p>
        </div>

        <div className="ml-auto flex flex-wrap gap-2">
          <Link to={approvalsPath} className={`${SECONDARY_BUTTON} py-2`}>
            Approvals
          </Link>
          <button type="button" onClick={loadReservations} className={`${SECONDARY_BUTTON} py-2`}>
            Refresh
          </button>
          <button
            type="button"
            onClick={() => openDialog('create')}
            className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-amber-400"
          >
            New reservation
          </button>
        </div>
      </div>

      {summary && <ActionSummary summary={summary} onClose={() => setSummary(null)} />}

      {/* Filters: status and station are sent to the API; the search box filters the list. */}
      <div className="mt-6 flex flex-wrap gap-3">
        <select
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
          aria-label="Filter by status"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="">All statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          name="stationId"
          value={filters.stationId}
          onChange={handleFilterChange}
          aria-label="Filter by station"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="">All stations</option>
          {stations.map((station) => (
            <option key={station.id} value={station.id}>
              {station.name}
            </option>
          ))}
        </select>

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search NIC, name, station or slot"
          className="min-w-60 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Reservation time</th>
              <th className="px-4 py-3">Prosumer</th>
              <th className="px-4 py-3">Station / slot</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            )}

            {!isLoading && visibleReservations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No reservations match these filters.
                </td>
              </tr>
            )}

            {!isLoading &&
              visibleReservations.map((reservation) => (
                <tr key={reservation.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {formatTimeRange(reservation.reservationStart, reservation.reservationEnd)}
                    </p>
                    <p className="text-xs text-slate-500">{formatRelative(reservation.reservationStart)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{reservation.prosumerName || '-'}</p>
                    <p className="font-mono text-xs text-slate-500">{reservation.prosumerNic}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-900">{reservation.stationName || '-'}</p>
                    <p className="text-xs text-slate-500">{reservation.slotName || '-'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={reservation.status} />
                  </td>
                  <td className="px-4 py-3">
                    <RowActions reservation={reservation} onAction={openDialog} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!isLoading && (
        <p className="mt-2 text-xs text-slate-500">
          Showing {visibleReservations.length} of {reservations.length} reservation
          {reservations.length === 1 ? '' : 's'}.
        </p>
      )}

      {dialog && (
        <Modal
          title={ACTIONS[dialog.mode].title}
          description={dialogDescription(dialog)}
          onClose={closeDialog}
          footer={
            <>
              <button type="button" onClick={closeDialog} className={SECONDARY_BUTTON}>
                Close
              </button>
              <button
                type={needsForm ? 'submit' : 'button'}
                form={needsForm ? 'reservation-form' : undefined}
                onClick={needsForm ? undefined : handleConfirm}
                disabled={isWorking}
                className={`rounded-md px-3 py-1.5 text-sm font-medium text-white transition disabled:opacity-60 ${
                  dialog.mode === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isWorking ? 'Working...' : confirmLabel(dialog.mode)}
              </button>
            </>
          }
        >
          {dialog.reservation && <ReservationDetails reservation={dialog.reservation} />}

          {needsForm && (
            <form id="reservation-form" onSubmit={handleConfirm} className="mt-3 space-y-3">
              {dialog.mode === 'create' && (
                <div>
                  <label htmlFor="reservation-nic" className="block text-sm font-medium text-slate-700">
                    Prosumer NIC
                  </label>
                  <input
                    id="reservation-nic"
                    value={form.nic}
                    onChange={(event) => setForm((current) => ({ ...current, nic: event.target.value }))}
                    list="active-prosumers"
                    required
                    placeholder="200012345678 or 912345678V"
                    className={FIELD_CLASS}
                  />
                  <datalist id="active-prosumers">
                    {prosumers.map((prosumer) => (
                      <option key={prosumer.userId} value={prosumer.nic}>
                        {prosumer.fullName}
                      </option>
                    ))}
                  </datalist>
                  <p className="mt-1 text-xs text-slate-500">The prosumer's account must be Active.</p>
                </div>
              )}

              <ReservationSlotPicker
                stationId={form.stationId}
                slotId={form.slotId}
                onStationChange={(stationId) => setForm((current) => ({ ...current, stationId }))}
                onSlotChange={(slotId) => setForm((current) => ({ ...current, slotId }))}
                excludeSlotId={dialog.reservation?.slotId}
                disabled={isWorking}
              />
            </form>
          )}

          {formError && (
            <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}

/**
 * The buttons for one row. Change and Cancel are offered only when the API says the booking
 * can still be modified (canModify); Approve only for a Pending booking.
 */
function RowActions({ reservation, onAction }) {
  const isOpen = reservation.status === 'Pending' || reservation.status === 'Approved'

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {reservation.status === 'Pending' && (
        <button
          type="button"
          onClick={() => onAction('approve', reservation)}
          className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-emerald-700"
        >
          Approve
        </button>
      )}

      {reservation.canModify && (
        <>
          <button
            type="button"
            onClick={() => onAction('change', reservation)}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Change slot
          </button>
          <button
            type="button"
            onClick={() => onAction('cancel', reservation)}
            className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"
          >
            Cancel
          </button>
        </>
      )}

      {isOpen && !reservation.canModify && (
        <span className="text-xs text-slate-500" title="Updates and cancellations need at least 12 hours' notice.">
          Locked (under 12 hours)
        </span>
      )}

      {!isOpen && <span className="text-xs text-slate-400">No actions</span>}
    </div>
  )
}

/**
 * A short read-only card describing a booking, shown inside the dialogs.
 */
function ReservationDetails({ reservation }) {
  return (
    <dl className="grid grid-cols-3 gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-sm">
      <dt className="text-slate-500">Prosumer</dt>
      <dd className="col-span-2 text-slate-900">
        {reservation.prosumerName || '-'} <span className="font-mono text-xs">({reservation.prosumerNic})</span>
      </dd>
      <dt className="text-slate-500">Station</dt>
      <dd className="col-span-2 text-slate-900">{reservation.stationName || '-'}</dd>
      <dt className="text-slate-500">Slot</dt>
      <dd className="col-span-2 text-slate-900">
        {reservation.slotName || '-'}, {formatTimeRange(reservation.reservationStart, reservation.reservationEnd)}
      </dd>
      <dt className="text-slate-500">Status</dt>
      <dd className="col-span-2">
        <StatusBadge value={reservation.status} />
      </dd>
    </dl>
  )
}

/**
 * The summary shown after a successful action: what was done and the booking as saved.
 */
function ActionSummary({ summary, onClose }) {
  const { heading, reservation } = summary

  return (
    <div role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-emerald-900">{heading}</p>
          <p className="mt-1 text-sm text-emerald-800">
            {reservation.prosumerName || reservation.prosumerNic} ({reservation.prosumerNic}) -{' '}
            {reservation.stationName}, {reservation.slotName},{' '}
            {formatTimeRange(reservation.reservationStart, reservation.reservationEnd)}. Status:{' '}
            <span className="font-semibold">{reservation.status}</span>. Updated {formatDateTime(reservation.updatedAt)}.
          </p>
          <p className="mt-1 font-mono text-xs text-emerald-700">Reservation id: {reservation.id}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close summary" className="text-emerald-800 hover:text-emerald-950">
          &#10005;
        </button>
      </div>
    </div>
  )
}

/**
 * The line under the dialog title explaining what will happen.
 */
function dialogDescription(dialog) {
  if (dialog.mode === 'create') {
    return 'Book an energy slot on behalf of a prosumer. New bookings start as Pending.'
  }
  if (dialog.mode === 'change') {
    return 'Move this booking to another slot. It goes back to Pending and must be approved again.'
  }
  if (dialog.mode === 'cancel') {
    return 'The booking is cancelled and the slot becomes free for others.'
  }
  return 'The prosumer can then use this booking and show its transaction QR code.'
}

/**
 * Text on the dialog's confirm button.
 */
function confirmLabel(mode) {
  if (mode === 'create') return 'Create reservation'
  if (mode === 'change') return 'Save new slot'
  if (mode === 'cancel') return 'Cancel reservation'
  return 'Approve'
}
