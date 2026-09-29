/*
 * File: ProsumersPage.jsx
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-23
 * Description: Backoffice management of solar prosumer accounts. Lists prosumers and lets a
 *              Backoffice officer add one, edit a profile, deactivate an account, and
 *              reactivate a deactivated one.
 *
 *              The NIC is the account's primary key, so it is typed once when adding and
 *              is read-only afterwards. The API enforces the NIC format and every other
 *              rule, and its message is shown as-is.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  activateProsumer,
  deactivateProsumer,
  listProsumers,
  registerProsumer,
  updateProsumer
} from '../api/prosumers.js'
import Modal from '../components/Modal.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

// An empty form, used when adding a prosumer.
const EMPTY_FORM = {
  nic: '',
  fullName: '',
  email: '',
  phone: '',
  address: '',
  password: ''
}

/**
 * Shows the date part of an ISO timestamp.
 */
function formatDate(value) {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleDateString()
}

/**
 * The prosumer management screen.
 */
export default function ProsumersPage() {
  const [prosumers, setProsumers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // The add/edit dialog. editingProsumer is null when adding.
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProsumer, setEditingProsumer] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // The confirm dialog for deactivate / reactivate.
  const [confirming, setConfirming] = useState(null)
  const [isWorking, setIsWorking] = useState(false)

  /**
   * Loads prosumers from the API using the current status filter.
   */
  const loadProsumers = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')

    try {
      setProsumers(await listProsumers({ status: statusFilter }))
    } catch (error) {
      setLoadError(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadProsumers()
  }, [loadProsumers])

  /**
   * Opens the dialog with an empty form for adding a prosumer.
   */
  function openCreateForm() {
    setEditingProsumer(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setIsFormOpen(true)
  }

  /**
   * Opens the dialog filled in with an existing prosumer. The NIC is shown but cannot
   * be changed, and an empty password means "keep the current one".
   */
  function openEditForm(prosumer) {
    setEditingProsumer(prosumer)
    setForm({
      nic: prosumer.nic ?? prosumer.userId,
      fullName: prosumer.fullName,
      email: prosumer.email ?? '',
      phone: prosumer.phone ?? '',
      address: prosumer.address ?? '',
      password: ''
    })
    setFormError('')
    setIsFormOpen(true)
  }

  /**
   * Keeps one form field in step with what was typed.
   */
  function handleFieldChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  /**
   * Saves the form. Adding sends the NIC; editing never does, because the NIC is the
   * account id and cannot change.
   */
  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    setFormError('')

    try {
      if (editingProsumer) {
        await updateProsumer(editingProsumer.userId, {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          address: form.address,
          newPassword: form.password
        })
      } else {
        // Created by a Backoffice officer, so the API makes this account Active
        // straight away instead of Pending.
        await registerProsumer({
          nic: form.nic,
          fullName: form.fullName,
          password: form.password,
          email: form.email,
          phone: form.phone,
          address: form.address
        })
      }

      setIsFormOpen(false)
      await loadProsumers()
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Runs the confirmed deactivate or reactivate, then refreshes the list.
   */
  async function handleConfirm() {
    setIsWorking(true)

    try {
      if (confirming.action === 'deactivate') {
        await deactivateProsumer(confirming.prosumer.userId)
      } else {
        await activateProsumer(confirming.prosumer.userId)
      }

      setConfirming(null)
      await loadProsumers()
    } catch (error) {
      setLoadError(error.message)
      setConfirming(null)
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Prosumer management</h1>
          <p className="mt-1 text-sm text-slate-600">
            Solar prosumer accounts, identified by NIC.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="ml-auto rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Add prosumer
        </button>
      </div>

      <div className="mt-6">
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Active">Active</option>
          <option value="Deactivated">Deactivated</option>
        </select>
      </div>

      {loadError && (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">NIC</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
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

            {!isLoading && prosumers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No prosumers match this filter.
                </td>
              </tr>
            )}

            {!isLoading &&
              prosumers.map((prosumer) => (
                <tr key={prosumer.userId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-900">{prosumer.nic}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{prosumer.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">{prosumer.email || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{prosumer.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge value={prosumer.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(prosumer.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(prosumer)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Edit
                      </button>

                      {prosumer.status === 'Active' ? (
                        <button
                          type="button"
                          onClick={() => setConfirming({ prosumer, action: 'deactivate' })}
                          className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirming({ prosumer, action: 'activate' })}
                          className="rounded-md border border-emerald-300 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                        >
                          {prosumer.status === 'Pending' ? 'Approve' : 'Reactivate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <Modal
          title={editingProsumer ? 'Edit prosumer' : 'Add prosumer'}
          description={
            editingProsumer
              ? 'The NIC is the account id and cannot be changed. Leave the password empty to keep the current one.'
              : 'Added by Backoffice, so this account is active straight away.'
          }
          onClose={() => setIsFormOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="prosumer-form"
                disabled={isSaving}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </>
          }
        >
          <form id="prosumer-form" onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="nic" className="block text-sm font-medium text-slate-700">
                NIC
              </label>
              <input
                id="nic"
                name="nic"
                value={form.nic}
                onChange={handleFieldChange}
                required
                disabled={Boolean(editingProsumer)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:bg-slate-100 disabled:text-slate-500"
              />
              {!editingProsumer && (
                <p className="mt-1 text-xs text-slate-500">
                  9 digits followed by V or X, or 12 digits.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                value={form.fullName}
                onChange={handleFieldChange}
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email <span className="text-slate-400">(optional)</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
                Phone <span className="text-slate-400">(optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                value={form.phone}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-slate-700">
                Address <span className="text-slate-400">(optional)</span>
              </label>
              <input
                id="address"
                name="address"
                value={form.address}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                {editingProsumer ? 'New password' : 'Password'}{' '}
                {editingProsumer && <span className="text-slate-400">(optional)</span>}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleFieldChange}
                required={!editingProsumer}
                autoComplete="new-password"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
              <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
            </div>

            {formError && (
              <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            )}
          </form>
        </Modal>
      )}

      {confirming && (
        <Modal
          title={confirming.action === 'deactivate' ? 'Deactivate prosumer' : 'Activate prosumer'}
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
                  confirming.action === 'deactivate'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isWorking ? 'Working...' : 'Confirm'}
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            {confirming.action === 'deactivate' ? (
              <>
                <span className="font-medium text-slate-900">{confirming.prosumer.fullName}</span>{' '}
                will no longer be able to log in to the mobile app. Only a Backoffice officer
                can reactivate the account.
              </>
            ) : (
              <>
                <span className="font-medium text-slate-900">{confirming.prosumer.fullName}</span>{' '}
                will be able to log in and reserve energy slots.
              </>
            )}
          </p>
        </Modal>
      )}
    </div>
  )
}
