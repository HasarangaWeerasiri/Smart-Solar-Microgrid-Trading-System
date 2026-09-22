/*
 * File: PendingActivationsPage.jsx
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-23
 * Description: Shows prosumers who registered on the mobile app and are waiting for
 *              approval. A Backoffice officer approves an account, which lets the person
 *              log in, or rejects it, which deactivates it.
 *
 *              Business rule 4: a new registration starts Pending. Business rule 3: only a
 *              Backoffice officer can activate an account. Both are enforced by the API.
 */

import { useCallback, useEffect, useState } from 'react'
import { activateProsumer, deactivateProsumer, listProsumers } from '../api/prosumers.js'
import Modal from '../components/Modal.jsx'

/**
 * Shows a date and time, so staff can see how long someone has been waiting.
 */
function formatDateTime(value) {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString()
}

/**
 * The pending activations screen.
 */
export default function PendingActivationsPage() {
  const [pending, setPending] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // The confirm dialog: { prosumer, action } where action is "approve" or "reject".
  const [confirming, setConfirming] = useState(null)
  const [isWorking, setIsWorking] = useState(false)

  /**
   * Loads every prosumer whose account is still waiting for approval.
   */
  const loadPending = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      setPending(await listProsumers({ status: 'Pending' }))
    } catch (loadFailure) {
      setError(loadFailure.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPending()
  }, [loadPending])

  /**
   * Approves or rejects the chosen registration, then refreshes the list.
   * Approving activates the account; rejecting deactivates it, which keeps the
   * record but stops the person logging in.
   */
  async function handleConfirm() {
    setIsWorking(true)

    try {
      if (confirming.action === 'approve') {
        await activateProsumer(confirming.prosumer.userId)
      } else {
        await deactivateProsumer(confirming.prosumer.userId)
      }

      setConfirming(null)
      await loadPending()
    } catch (actionFailure) {
      setError(actionFailure.message)
      setConfirming(null)
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pending activations</h1>
          <p className="mt-1 text-sm text-slate-600">
            Prosumers who registered on the mobile app and cannot log in until approved.
          </p>
        </div>

        <button
          type="button"
          onClick={loadPending}
          className="ml-auto rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Refresh
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!isLoading && pending.length === 0 && !error && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center">
          <p className="text-sm text-emerald-800">
            Nothing waiting. Every registration has been dealt with.
          </p>
        </div>
      )}

      {(isLoading || pending.length > 0) && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">NIC</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Registered</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              )}

              {!isLoading &&
                pending.map((prosumer) => (
                  <tr key={prosumer.userId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-900">{prosumer.nic}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{prosumer.fullName}</td>
                    <td className="px-4 py-3 text-slate-600">{prosumer.email || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{prosumer.phone || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{prosumer.address || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(prosumer.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirming({ prosumer, action: 'approve' })}
                          className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming({ prosumer, action: 'reject' })}
                          className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"
                        >
                          Reject
                        </button>
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
          title={confirming.action === 'approve' ? 'Approve registration' : 'Reject registration'}
          onClose={() => setConfirming(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isWorking}
                className={`rounded-md px-3 py-1.5 text-sm font-medium text-white transition disabled:opacity-60 ${
                  confirming.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isWorking ? 'Working...' : 'Confirm'}
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            {confirming.action === 'approve' ? (
              <>
                <span className="font-medium text-slate-900">{confirming.prosumer.fullName}</span>{' '}
                (NIC {confirming.prosumer.nic}) will be able to log in to the mobile app and
                reserve energy slots.
              </>
            ) : (
              <>
                <span className="font-medium text-slate-900">{confirming.prosumer.fullName}</span>{' '}
                (NIC {confirming.prosumer.nic}) will be deactivated and cannot log in. The record
                is kept, and a Backoffice officer can activate it later.
              </>
            )}
          </p>
        </Modal>
      )}
    </div>
  )
}
