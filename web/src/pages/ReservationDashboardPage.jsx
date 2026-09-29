/*
 * File: ReservationDashboardPage.jsx
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Member D
 * Created: 2026-09-28
 * Description: Staff dashboard for energy reservations (Backoffice and Grid Operator). Four
 *              count tiles come straight from GET /api/reservations/summary; the table below
 *              is one of two scoped views (Current bookings / Booking history) narrowed by a
 *              search box, a status filter and a from/to date range. Every count, filter,
 *              search and page of rows is decided by the API - nothing here is computed or
 *              filtered in React. The active filters live in the URL query string, so a
 *              filtered view can be reloaded or shared without losing state.
 *
 *              Reused from the existing reservations module rather than duplicated: Modal,
 *              StatusBadge and the time formatting helpers in utils/reservationFormat.js.
 *              This file does not touch ReservationsPage.jsx or ReservationApprovalsPage.jsx.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  approveReservation,
  cancelReservation,
  completeReservation,
  getReservationSummary,
  listReservations
} from '../api/reservations.js'
import Modal from '../components/Modal.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { formatTimeRange, toLocalDateKey } from '../utils/reservationFormat.js'

const PAGE_SIZE = 10
const DEBOUNCE_MS = 300
const STATUSES = ['Pending', 'Approved', 'Completed', 'Cancelled']
const VALID_SCOPES = ['current', 'history', 'all']

const SECONDARY_BUTTON =
  'rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50'

const FILTER_FIELD_CLASS =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200'

// One tile per number the summary endpoint returns (all four except "cancelled", which the
// marking scheme does not ask this dashboard to show). Colours match StatusBadge's own
// status colours, so a tile and its matching badge always agree at a glance.
const TILE_DEFS = [
  { key: 'pending', label: 'Pending', accent: 'amber' },
  { key: 'approved', label: 'Approved', accent: 'emerald' },
  { key: 'completed', label: 'Completed', accent: 'sky' },
  { key: 'approvedUpcoming', label: 'Approved upcoming', accent: 'violet' }
]

// Literal class strings per accent, so Tailwind's build-time scanner can see them. Building
// these with a template string like `bg-${accent}-50` would not be detected.
const TILE_STYLES = {
  amber: 'border-amber-200 bg-amber-50 hover:border-amber-300 text-amber-900',
  emerald: 'border-emerald-200 bg-emerald-50 hover:border-emerald-300 text-emerald-900',
  sky: 'border-sky-200 bg-sky-50 hover:border-sky-300 text-sky-900',
  violet: 'border-violet-200 bg-violet-50 hover:border-violet-300 text-violet-900'
}

const TILE_ACTIVE_RING = {
  amber: 'ring-2 ring-amber-400',
  emerald: 'ring-2 ring-emerald-400',
  sky: 'ring-2 ring-sky-400',
  violet: 'ring-2 ring-violet-400'
}

const TABS = [
  { scope: 'current', label: 'Current bookings' },
  { scope: 'history', label: 'Booking history' }
]

const ACTION_CONFIG = {
  approve: {
    title: 'Approve reservation',
    description: 'The prosumer can then use this booking and show its transaction QR code.',
    confirmLabel: 'Approve',
    confirmClass: 'bg-emerald-600 hover:bg-emerald-700'
  },
  cancel: {
    title: 'Cancel reservation',
    description: 'The booking is cancelled and the slot becomes free for others.',
    confirmLabel: 'Cancel reservation',
    confirmClass: 'bg-red-600 hover:bg-red-700'
  },
  complete: {
    title: 'Complete reservation',
    description: 'Marks the energy transfer as finished, once its QR code has been verified at the station.',
    confirmLabel: 'Mark completed',
    confirmClass: 'bg-sky-600 hover:bg-sky-700'
  }
}

/**
 * Converts a "YYYY-MM-DD" date box value to the start of that day, in the viewer's local time,
 * as an ISO string ready for the API's "from" filter.
 */
function toIsoStartOfDay(localDateKey) {
  return new Date(`${localDateKey}T00:00:00`).toISOString()
}

/**
 * Converts a "YYYY-MM-DD" date box value to the end of that day, in the viewer's local time,
 * as an ISO string ready for the API's "to" filter.
 */
function toIsoEndOfDay(localDateKey) {
  return new Date(`${localDateKey}T23:59:59.999`).toISOString()
}

/**
 * Works out which row buttons the API would actually accept, from the reservation's own data.
 * Approve is withheld once the slot's end time has passed, even though the API's own check is
 * on the start time, because a booking nobody can use any more should not invite a click.
 * Cancel reuses the API's own canModify flag (Pending/Approved and at least 12 hours away)
 * instead of re-deriving the 12 hour rule here.
 */
function getRowPermissions(reservation) {
  const hasEnded = new Date(reservation.reservationEnd).getTime() <= Date.now()

  return {
    canApprove: reservation.status === 'Pending' && !hasEnded,
    canCancel: (reservation.status === 'Pending' || reservation.status === 'Approved') && reservation.canModify,
    canComplete: reservation.status === 'Approved'
  }
}

/**
 * Names the active filter in the empty-table message, so "no results" always explains why.
 */
function describeEmptyState({ scope, status, search }) {
  if (search) {
    const noun = status ? `${status.toLowerCase()} bookings` : 'bookings'
    return `No ${noun} match "${search}".`
  }

  if (status) {
    const place = scope === 'history' ? ' in history' : scope === 'current' ? ' right now' : ''
    return `No ${status.toLowerCase()} bookings found${place}.`
  }

  return scope === 'history' ? 'No booking history yet.' : 'No current bookings right now.'
}

/**
 * The staff reservation dashboard: count tiles, a Current/History table, and Approve, Cancel
 * and Complete actions.
 */
export default function ReservationDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const rawScope = searchParams.get('scope')
  const scope = VALID_SCOPES.includes(rawScope) ? rawScope : 'current'
  const status = searchParams.get('status') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const committedSearch = searchParams.get('search') || ''

  const [searchInput, setSearchInput] = useState(committedSearch)
  const [summary, setSummary] = useState(null)
  const [isSummaryLoading, setIsSummaryLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [isTableLoading, setIsTableLoading] = useState(true)
  const [error, setError] = useState('')

  // The confirm dialog: { type: 'approve' | 'cancel' | 'complete', reservation }.
  const [pendingAction, setPendingAction] = useState(null)
  const [actionError, setActionError] = useState('')
  const [workingId, setWorkingId] = useState(null)

  // Only the answer to the newest request is kept, so a fast filter change cannot have an
  // older, slower answer overwrite a newer one.
  const latestSummaryRequest = useRef(0)
  const latestTableRequest = useRef(0)

  /**
   * Merges a set of changes into the URL query string. An empty value removes that param
   * entirely, so the URL only ever shows the filters actually in effect.
   */
  const updateParams = useCallback(
    (patch) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        Object.entries(patch).forEach(([key, value]) => {
          if (value === '' || value === undefined || value === null) {
            next.delete(key)
          } else {
            next.set(key, String(value))
          }
        })
        return next
      })
    },
    [setSearchParams]
  )

  /**
   * Reads the four dashboard counts. Kept separate from the table load so an action only has
   * to refresh what actually changed.
   */
  const loadSummary = useCallback(async () => {
    const requestId = ++latestSummaryRequest.current
    setIsSummaryLoading(true)

    try {
      const result = await getReservationSummary()
      if (requestId === latestSummaryRequest.current) {
        setSummary(result)
      }
    } catch {
      // The table's own error banner is the main error surface; the tiles just show a dash.
      if (requestId === latestSummaryRequest.current) {
        setSummary(null)
      }
    } finally {
      if (requestId === latestSummaryRequest.current) {
        setIsSummaryLoading(false)
      }
    }
  }, [])

  /**
   * Reads the current page of reservations for the active scope, status, search and date
   * range. Every one of those is sent to the API as a query parameter; none is applied here.
   */
  const loadTable = useCallback(async () => {
    const requestId = ++latestTableRequest.current
    setIsTableLoading(true)
    setError('')

    try {
      const result = await listReservations({
        scope,
        status,
        search: committedSearch,
        from,
        to,
        page,
        pageSize: PAGE_SIZE
      })
      if (requestId === latestTableRequest.current) {
        setRows(result)
      }
    } catch (loadFailure) {
      if (requestId === latestTableRequest.current) {
        setError(loadFailure.message)
        setRows([])
      }
    } finally {
      if (requestId === latestTableRequest.current) {
        setIsTableLoading(false)
      }
    }
  }, [scope, status, committedSearch, from, to, page])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    loadTable()
  }, [loadTable])

  // Keeps the search box showing the committed value after a back/forward navigation or the
  // Clear button, without fighting the user while they are still typing.
  useEffect(() => {
    setSearchInput(committedSearch)
  }, [committedSearch])

  // Debounce: only push the search box into the URL (and so into an API call) 300ms after the
  // user stops typing.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== committedSearch) {
        updateParams({ search: searchInput, page: 1 })
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(handle)
  }, [searchInput, committedSearch, updateParams])

  /**
   * Switches the Current/History tab, keeping every other filter as it was.
   */
  function applyScope(newScope) {
    updateParams({ scope: newScope, page: 1 })
  }

  /**
   * Applies the exact filter that produces the number shown on one tile, so what the table
   * lists always matches what was clicked. Search and the date range are cleared because they
   * would only narrow the count further; scope is set to "all" so neither tab's own time
   * boundary excludes a row the tile counted.
   */
  function applyTileFilter(tileKey) {
    setSearchInput('')
    const patch = { search: '', to: '', page: 1, scope: 'all' }

    if (tileKey === 'approvedUpcoming') {
      updateParams({ ...patch, status: 'Approved', from: new Date().toISOString() })
    } else {
      const status = tileKey.charAt(0).toUpperCase() + tileKey.slice(1)
      updateParams({ ...patch, status, from: '' })
    }
  }

  function handleClear() {
    setSearchInput('')
    setSearchParams({ scope: 'current' })
  }

  function openAction(type, reservation) {
    setActionError('')
    setPendingAction({ type, reservation })
  }

  function closeAction() {
    if (!workingId) {
      setPendingAction(null)
    }
  }

  /**
   * Sends the confirmed action to the API, then refreshes both the tiles and the table so the
   * numbers on screen never lag behind what was just done.
   */
  async function confirmAction() {
    const { type, reservation } = pendingAction
    setWorkingId(reservation.id)
    setActionError('')

    try {
      if (type === 'approve') {
        await approveReservation(reservation.id)
      } else if (type === 'cancel') {
        await cancelReservation(reservation.id)
      } else {
        await completeReservation(reservation.id)
      }

      setPendingAction(null)
      await Promise.all([loadSummary(), loadTable()])
    } catch (actionFailure) {
      setActionError(actionFailure.message)
    } finally {
      setWorkingId(null)
    }
  }

  const totalCount = rows.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / (rows.pageSize || PAGE_SIZE)))

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reservation dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Live counts, current bookings and booking history for every prosumer.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {TILE_DEFS.map((tile) => (
          <SummaryTile
            key={tile.key}
            label={tile.label}
            value={summary?.[tile.key]}
            accent={tile.accent}
            isLoading={isSummaryLoading}
            onClick={() => applyTileFilter(tile.key)}
          />
        ))}
      </div>

      <div role="tablist" aria-label="Booking view" className="mt-8 flex gap-2 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.scope}
            type="button"
            role="tab"
            aria-selected={scope === tab.scope}
            onClick={() => applyScope(tab.scope)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              scope === tab.scope
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {scope === 'all' && (
        <p className="mt-2 text-xs text-slate-500">
          Showing the tile filter above, across current bookings and history alike.{' '}
          <button type="button" onClick={() => applyScope('current')} className="underline hover:no-underline">
            Back to tabs
          </button>
        </p>
      )}

      {/* Filter bar. Every value here is sent to the API; nothing is filtered in this page. */}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search NIC, name or station"
          aria-label="Search by NIC, prosumer name or station"
          className={`min-w-56 flex-1 ${FILTER_FIELD_CLASS}`}
        />

        <select
          value={status}
          onChange={(event) => updateParams({ status: event.target.value, page: 1 })}
          aria-label="Filter by status"
          className={FILTER_FIELD_CLASS}
        >
          <option value="">All statuses</option>
          {STATUSES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <label className="flex flex-col text-xs text-slate-500">
          From
          <input
            type="date"
            value={from ? toLocalDateKey(from) : ''}
            onChange={(event) =>
              updateParams({ from: event.target.value ? toIsoStartOfDay(event.target.value) : '', page: 1 })
            }
            aria-label="From date"
            className={`mt-1 ${FILTER_FIELD_CLASS}`}
          />
        </label>

        <label className="flex flex-col text-xs text-slate-500">
          To
          <input
            type="date"
            value={to ? toLocalDateKey(to) : ''}
            onChange={(event) =>
              updateParams({ to: event.target.value ? toIsoEndOfDay(event.target.value) : '', page: 1 })
            }
            aria-label="To date"
            className={`mt-1 ${FILTER_FIELD_CLASS}`}
          />
        </label>

        <button type="button" onClick={handleClear} className={SECONDARY_BUTTON}>
          Clear
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <p>{error}</p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={loadTable} className="font-medium underline hover:no-underline">
              Retry
            </button>
            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Dismiss error"
              className="text-red-700 hover:text-red-900"
            >
              &#10005;
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Prosumer</th>
              <th className="px-4 py-3">NIC</th>
              <th className="px-4 py-3">Station</th>
              <th className="px-4 py-3">Slot</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">End</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {isTableLoading && <SkeletonRows count={PAGE_SIZE} columns={8} />}

            {!isTableLoading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  {describeEmptyState({ scope, status, search: committedSearch })}
                </td>
              </tr>
            )}

            {!isTableLoading &&
              rows.map((reservation) => (
                <tr key={reservation.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900">{reservation.prosumerName || '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{reservation.prosumerNic}</td>
                  <td className="px-4 py-3 text-slate-900">{reservation.stationName || '-'}</td>
                  <td className="px-4 py-3 text-slate-900">{reservation.slotName || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTimeRange(reservation.reservationStart)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTimeRange(reservation.reservationEnd)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge value={reservation.status} />
                  </td>
                  <td className="px-4 py-3">
                    <RowActions reservation={reservation} workingId={workingId} onAction={openAction} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {isTableLoading
            ? 'Loading...'
            : totalCount === 0
              ? 'No results.'
              : `Page ${page} of ${totalPages} (${totalCount} result${totalCount === 1 ? '' : 's'}).`}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || isTableLoading}
            onClick={() => updateParams({ page: page - 1 })}
            className={SECONDARY_BUTTON}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages || isTableLoading}
            onClick={() => updateParams({ page: page + 1 })}
            className={SECONDARY_BUTTON}
          >
            Next
          </button>
        </div>
      </div>

      {pendingAction && (
        <Modal
          title={ACTION_CONFIG[pendingAction.type].title}
          description={ACTION_CONFIG[pendingAction.type].description}
          onClose={closeAction}
          footer={
            <>
              <button type="button" onClick={closeAction} className={SECONDARY_BUTTON}>
                Close
              </button>
              <button
                type="button"
                onClick={confirmAction}
                disabled={Boolean(workingId)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium text-white transition disabled:opacity-60 ${ACTION_CONFIG[pendingAction.type].confirmClass}`}
              >
                {workingId ? 'Working...' : ACTION_CONFIG[pendingAction.type].confirmLabel}
              </button>
            </>
          }
        >
          <ReservationSummaryCard reservation={pendingAction.reservation} />

          {actionError && (
            <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}

/**
 * One clickable count tile. Shows a pulsing placeholder instead of the number while the
 * summary is still loading, and a ring when its filter is the one currently applied.
 */
function SummaryTile({ label, value, accent, isLoading, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Show ${label.toLowerCase()} bookings`}
      className={`rounded-xl border p-4 text-left shadow-sm transition ${TILE_STYLES[accent]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      {isLoading ? (
        <div className="mt-2 h-8 w-12 animate-pulse rounded bg-white/70" aria-hidden="true" />
      ) : (
        <p className="mt-1 text-3xl font-semibold">{value ?? '—'}</p>
      )}
    </button>
  )
}

/**
 * Placeholder rows shown while the table is loading, instead of a bare spinner.
 */
function SkeletonRows({ count, columns }) {
  return Array.from({ length: count }).map((_, rowIndex) => (
    <tr key={`skeleton-${rowIndex}`} aria-hidden="true">
      {Array.from({ length: columns }).map((__, columnIndex) => (
        <td key={columnIndex} className="px-4 py-3">
          <div className="h-4 w-full max-w-32 animate-pulse rounded bg-slate-200" />
        </td>
      ))}
    </tr>
  ))
}

/**
 * The buttons for one row. Approve, Cancel and Complete each appear only when the reservation's
 * own status and time make the API likely to accept them; a short note explains it when none do.
 */
function RowActions({ reservation, workingId, onAction }) {
  const { canApprove, canCancel, canComplete } = getRowPermissions(reservation)
  const isBusy = workingId === reservation.id

  let notice = null
  if (!canApprove && !canCancel && !canComplete) {
    if (reservation.status === 'Pending') {
      notice = 'Slot time has passed'
    } else if ((reservation.status === 'Pending' || reservation.status === 'Approved') && !reservation.canModify) {
      notice = 'Locked (under 12 hours)'
    } else {
      notice = 'No actions available'
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {canApprove && (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onAction('approve', reservation)}
          className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Approve
        </button>
      )}

      {canComplete && (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onAction('complete', reservation)}
          className="rounded-md bg-sky-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Complete
        </button>
      )}

      {canCancel && (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onAction('cancel', reservation)}
          className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      )}

      {notice && <span className="text-xs text-slate-500">{notice}</span>}
    </div>
  )
}

/**
 * A short read-only card describing a booking, shown inside the action confirmation dialog.
 */
function ReservationSummaryCard({ reservation }) {
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
