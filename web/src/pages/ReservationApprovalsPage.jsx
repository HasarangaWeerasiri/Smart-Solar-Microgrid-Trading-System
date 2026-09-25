/*
 * File: ReservationApprovalsPage.jsx
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-25
 * Description: Pending energy reservations waiting for approval, soonest first. Backoffice and
 *              Grid Operator staff approve a booking, which lets the prosumer's app show the
 *              transaction QR code, or reject it, which cancels it and frees the slot.
 *
 *              The API decides everything: only a Pending booking whose time has not passed can
 *              be approved, and rejecting (cancelling) needs 12 hours' notice. This page shows
 *              the API's message when it refuses, and uses canModify to offer Reject.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { approveReservation, cancelReservation, listReservations } from '../api/reservations.js'
import Modal from '../components/Modal.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { formatDateTime, formatRelative, formatTimeRange } from '../utils/reservationFormat.js'

/**
 * The reservation approvals screen.
 */
export default function ReservationApprovalsPage() {
  const { pathname } = useLocation()
  const reservationsPath = pathname.replace(/\/approvals\/?$/, '')

  const [pending, setPending] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // The confirm dialog: { action: 'approve' | 'reject', reservation }.
  const [confirming, setConfirming] = useState(null)
  const [dialogError, setDialogError] = useState('')
  const [isWorking, setIsWorking] = useState(false)

  // Summary of the last decision: { heading, reservation }.
  const [summary, setSummary] = useState(null)

  /**
   * Loads every Pending reservation, read live from the API.
   */
  const loadPending = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      setPending(await listReservations({ status: 'Pending' }))
    } catch (loadFailure) {
      setError(loadFailure.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPending()
  }, [loadPending])

  // The API lists the latest time first; the queue is easier to work through soonest first.
  const queue = useMemo(
    () => [...pending].sort((a, b) => new Date(a.reservationStart) - new Date(b.reservationStart)),
    [pending]
  )

  /**
   * Opens the confirm dialog for one booking.
   */
  function openConfirm(action, reservation) {
    setDialogError('')
    setConfirming({ action, reservation })
  }

  /**
   * Closes the dialog unless a request is still running.
   */
  function closeConfirm() {
    if (!isWorking) {
      setConfirming(null)
    }
  }

  /**
   * Approves or rejects (cancels) the chosen booking, then shows a summary and reloads.
   * If the API refuses, its message stays in the dialog.
   */
  async function handleConfirm() {
    setIsWorking(true)
    setDialogError('')

    try {
      const isApprove = confirming.action === 'approve'
      const saved = isApprove
        ? await approveReservation(confirming.reservation.id)
        : await cancelReservation(confirming.reservation.id)

      setSummary({ heading: isApprove ? 'Reservation approved' : 'Reservation rejected (cancelled)', reservation: saved })
      setConfirming(null)
      await loadPending()
    } catch (actionFailure) {
      setDialogError(actionFailure.message)
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reservation approvals</h1>
          <p className="mt-1 text-sm text-slate-600">
            Pending bookings, soonest first. Approve them so the prosumer can use the slot.
          </p>
        </div>

        <div className="ml-auto flex gap-2">
          <Link
            to={reservationsPath}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            All reservations
          </Link>
          <button
            type="button"
            onClick={loadPending}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Refresh
          </button>
        </div>
      </div>

      {summary && (
        <div role="status" className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-900">{summary.heading}</p>
            <p className="mt-1 text-sm text-emerald-800">
              {summary.reservation.prosumerName || summary.reservation.prosumerNic} ({summary.reservation.prosumerNic}) -{' '}
              {summary.reservation.stationName}, {summary.reservation.slotName},{' '}
              {formatTimeRange(summary.reservation.reservationStart, summary.reservation.reservationEnd)}. Status:{' '}
              <span className="font-semibold">{summary.reservation.status}</span>. Updated{' '}
              {formatDateTime(summary.reservation.updatedAt)}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSummary(null)}
            aria-label="Close summary"
            className="text-emerald-800 hover:text-emerald-950"
          >
            &#10005;
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!isLoading && !error && queue.length === 0 && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center">
          <p className="text-sm text-emerald-800">Nothing waiting. Every booking has been dealt with.</p>
        </div>
      )}

      {(isLoading || queue.length > 0) && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Reservation time</th>
                <th className="px-4 py-3">Prosumer</th>
                <th className="px-4 py-3">Station / slot</th>
                <th className="px-4 py-3">Requested</th>
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

              {!isLoading &&
                queue.map((reservation) => (
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
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(reservation.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openConfirm('approve', reservation)}
                          className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                        {reservation.canModify ? (
                          <button
                            type="button"
                            onClick={() => openConfirm('reject', reservation)}
                            className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"
                          >
                            Reject
                          </button>
                        ) : (
                          <span
                            className="self-center text-xs text-slate-500"
                            title="Cancelling needs at least 12 hours' notice."
                          >
                            Can't reject (under 12 hours)
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {confirming && (
        <Modal
          title={confirming.action === 'approve' ? 'Approve reservation' : 'Reject reservation'}
          description={
            confirming.action === 'approve'
              ? 'The prosumer can then use this booking and show its transaction QR code.'
              : 'Rejecting cancels the booking and frees the slot for others.'
          }
          onClose={closeConfirm}
          footer={
            <>
              <button
                type="button"
                onClick={closeConfirm}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isWorking}
                className={`rounded-md px-3 py-1.5 text-sm font-medium text-white transition disabled:opacity-60 ${
                  confirming.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isWorking ? 'Working...' : confirming.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </>
          }
        >
          <dl className="grid grid-cols-3 gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <dt className="text-slate-500">Prosumer</dt>
            <dd className="col-span-2 text-slate-900">
              {confirming.reservation.prosumerName || '-'}{' '}
              <span className="font-mono text-xs">({confirming.reservation.prosumerNic})</span>
            </dd>
            <dt className="text-slate-500">Station</dt>
            <dd className="col-span-2 text-slate-900">{confirming.reservation.stationName || '-'}</dd>
            <dt className="text-slate-500">Slot</dt>
            <dd className="col-span-2 text-slate-900">
              {confirming.reservation.slotName || '-'},{' '}
              {formatTimeRange(confirming.reservation.reservationStart, confirming.reservation.reservationEnd)}
            </dd>
            <dt className="text-slate-500">Status</dt>
            <dd className="col-span-2">
              <StatusBadge value={confirming.reservation.status} />
            </dd>
          </dl>

          {dialogError && (
            <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {dialogError}
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}
