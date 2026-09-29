/*
 * File: UsersPage.jsx
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-23
 * Description: Backoffice user management. Lists Backoffice and Grid Operator accounts and
 *              lets a Backoffice officer add, edit, deactivate and reactivate them.
 *
 *              This page only shows data and sends requests. Every rule - unique email,
 *              password length, allowed roles, and the guards that stop you locking
 *              yourself out - is enforced by the API, and its message is shown as-is.
 */

import { useCallback, useEffect, useState } from 'react'
import { activateUser, createUser, deactivateUser, listUsers, updateUser } from '../api/users.js'
import Modal from '../components/Modal.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { ROLES } from '../roles.js'

// An empty form, used when adding a new user.
const EMPTY_FORM = {
  fullName: '',
  email: '',
  role: ROLES.GRID_OPERATOR,
  phone: '',
  password: ''
}

/**
 * Shows the date part of an ISO timestamp, which is all the table needs.
 */
function formatDate(value) {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleDateString()
}

/**
 * The user management screen.
 */
export default function UsersPage() {
  const { user: currentUser } = useAuth()

  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filters, setFilters] = useState({ role: '', status: '' })

  // The add/edit dialog. editingUser is null when adding a new user.
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // The confirm dialog for deactivate / reactivate.
  const [confirming, setConfirming] = useState(null)
  const [isWorking, setIsWorking] = useState(false)

  /**
   * Loads the staff list from the API using the current filters.
   */
  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')

    try {
      setUsers(await listUsers(filters))
    } catch (error) {
      setLoadError(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  // Reload whenever the page opens or a filter changes.
  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  /**
   * Opens the dialog with an empty form for adding a user.
   */
  function openCreateForm() {
    setEditingUser(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setIsFormOpen(true)
  }

  /**
   * Opens the dialog filled in with an existing user. The password box stays empty,
   * which means "keep the current password".
   */
  function openEditForm(user) {
    setEditingUser(user)
    setForm({
      fullName: user.fullName,
      email: user.email ?? '',
      role: user.role,
      phone: user.phone ?? '',
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
   * Sends the form to the API, either creating a user or updating one,
   * then refreshes the list. Any API error is shown inside the dialog.
   */
  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    setFormError('')

    try {
      if (editingUser) {
        await updateUser(editingUser.userId, {
          fullName: form.fullName,
          email: form.email,
          role: form.role,
          phone: form.phone,
          newPassword: form.password
        })
      } else {
        await createUser({
          fullName: form.fullName,
          email: form.email,
          role: form.role,
          phone: form.phone,
          password: form.password
        })
      }

      setIsFormOpen(false)
      await loadUsers()
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
        await deactivateUser(confirming.user.userId)
      } else {
        await activateUser(confirming.user.userId)
      }

      setConfirming(null)
      await loadUsers()
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
          <h1 className="text-2xl font-semibold text-slate-900">User management</h1>
          <p className="mt-1 text-sm text-slate-600">
            Backoffice and Grid Operator accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="ml-auto rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Add user
        </button>
      </div>

      {/* Filters. Changing one reloads the list from the API. */}
      <div className="mt-6 flex flex-wrap gap-3">
        <select
          value={filters.role}
          onChange={(event) => setFilters((f) => ({ ...f, role: event.target.value }))}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          <option value={ROLES.BACKOFFICE}>Backoffice</option>
          <option value={ROLES.GRID_OPERATOR}>Grid Operator</option>
        </select>

        <select
          value={filters.status}
          onChange={(event) => setFilters((f) => ({ ...f, status: event.target.value }))}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
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
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Created</th>
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

            {!isLoading && users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No users match these filters.
                </td>
              </tr>
            )}

            {!isLoading &&
              users.map((user) => {
                // You cannot deactivate your own account. The API refuses it as well;
                // hiding the button just avoids an error the user cannot act on.
                const isSelf = user.userId === currentUser?.userId

                return (
                  <tr key={user.userId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {user.fullName}
                      {isSelf && <span className="ml-2 text-xs text-slate-500">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3 text-slate-600">{user.role}</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={user.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.phone || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(user)}
                          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Edit
                        </button>

                        {user.status === 'Deactivated' ? (
                          <button
                            type="button"
                            onClick={() => setConfirming({ user, action: 'activate' })}
                            className="rounded-md border border-emerald-300 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                          >
                            Reactivate
                          </button>
                        ) : (
                          !isSelf && (
                            <button
                              type="button"
                              onClick={() => setConfirming({ user, action: 'deactivate' })}
                              className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"
                            >
                              Deactivate
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <Modal
          title={editingUser ? 'Edit user' : 'Add user'}
          description={
            editingUser
              ? 'Leave the password empty to keep the current one.'
              : 'The new account can log in straight away.'
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
                form="user-form"
                disabled={isSaving}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </>
          }
        >
          <form id="user-form" onSubmit={handleSubmit} className="space-y-3">
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
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleFieldChange}
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-700">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={form.role}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              >
                <option value={ROLES.GRID_OPERATOR}>Grid Operator</option>
                <option value={ROLES.BACKOFFICE}>Backoffice</option>
              </select>
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
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                {editingUser ? 'New password' : 'Password'}{' '}
                {editingUser && <span className="text-slate-400">(optional)</span>}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleFieldChange}
                required={!editingUser}
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
          title={confirming.action === 'deactivate' ? 'Deactivate user' : 'Reactivate user'}
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
                <span className="font-medium text-slate-900">{confirming.user.fullName}</span> will
                no longer be able to log in. A Backoffice officer can reactivate the account later.
              </>
            ) : (
              <>
                <span className="font-medium text-slate-900">{confirming.user.fullName}</span> will
                be able to log in again.
              </>
            )}
          </p>
        </Modal>
      )}
    </div>
  )
}
