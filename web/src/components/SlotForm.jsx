import { useEffect, useState } from 'react'

const EMPTY_FORM = {
  slotName: '',
  startTime: '',
  endTime: '',
  isAvailable: true
}

/**
 * Converts an API DateTime value into the format required
 * by an HTML datetime-local input.
 */
function toDateTimeLocal(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const pad = (number) => String(number).padStart(2, '0')

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

export default function SlotForm({
  slot = null,
  onSubmit,
  onCancel,
  loading = false,
  error = ''
}) {
  const [formData, setFormData] = useState(EMPTY_FORM)

  const isEditing = Boolean(slot)

  useEffect(() => {
    if (slot) {
      setFormData({
        slotName: slot.slotName ?? '',
        startTime: toDateTimeLocal(slot.startTime),
        endTime: toDateTimeLocal(slot.endTime),
        isAvailable: slot.isAvailable ?? true
      })
    } else {
      setFormData(EMPTY_FORM)
    }
  }, [slot])

  function handleChange(event) {
    const { name, value, type, checked } = event.target

    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    const slotData = {
      slotName: formData.slotName.trim(),
      startTime: formData.startTime,
      endTime: formData.endTime,
      isAvailable: formData.isAvailable
    }

    onSubmit(slotData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* API ERROR */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span className="font-semibold">Error: </span>
          {error}
        </div>
      )}

      {/* SLOT NAME */}
      <div>
        <label
          htmlFor="slotName"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Slot Name
          <span className="ml-1 text-red-500">*</span>
        </label>

        <input
          id="slotName"
          name="slotName"
          type="text"
          value={formData.slotName}
          onChange={handleChange}
          placeholder="Example: Morning Slot"
          required
          disabled={loading}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
      </div>

      {/* START TIME */}
      <div>
        <label
          htmlFor="startTime"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Start Date & Time
          <span className="ml-1 text-red-500">*</span>
        </label>

        <input
          id="startTime"
          name="startTime"
          type="datetime-local"
          value={formData.startTime}
          onChange={handleChange}
          required
          disabled={loading}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
      </div>

      {/* END TIME */}
      <div>
        <label
          htmlFor="endTime"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          End Date & Time
          <span className="ml-1 text-red-500">*</span>
        </label>

        <input
          id="endTime"
          name="endTime"
          type="datetime-local"
          value={formData.endTime}
          onChange={handleChange}
          required
          disabled={loading}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
      </div>

      {/* AVAILABILITY */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            name="isAvailable"
            type="checkbox"
            checked={formData.isAvailable}
            onChange={handleChange}
            disabled={loading}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
          />

          <div>
            <span className="block text-sm font-medium text-slate-800">
              Available for booking
            </span>

            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Keep this selected if the slot should be available
              for energy reservations.
            </span>
          </div>
        </label>
      </div>

      {/* BUTTONS */}
      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? isEditing
              ? 'Saving...'
              : 'Creating...'
            : isEditing
              ? 'Save Changes'
              : 'Create Slot'}
        </button>
      </div>
    </form>
  )
}