import { useEffect, useState } from 'react'

const EMPTY_FORM = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  capacityKwh: '',
  operatingStartTime: '',
  operatingEndTime: ''
}

export default function StationForm({
  station = null,
  onSubmit,
  onCancel,
  loading = false,
  error = ''
}) {
  const [formData, setFormData] = useState(EMPTY_FORM)

  const isEditing = Boolean(station)

  // Fill the form when editing an existing station.
  useEffect(() => {
    if (station) {
      setFormData({
        name: station.name ?? '',
        address: station.address ?? '',
        latitude: station.latitude ?? '',
        longitude: station.longitude ?? '',
        capacityKwh: station.capacityKwh ?? '',
        operatingStartTime: station.operatingStartTime ?? '',
        operatingEndTime: station.operatingEndTime ?? ''
      })
    } else {
      setFormData(EMPTY_FORM)
    }
  }, [station])

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    const stationData = {
      name: formData.name.trim(),
      address: formData.address.trim(),
      latitude: Number(formData.latitude),
      longitude: Number(formData.longitude),
      capacityKwh: Number(formData.capacityKwh),
      operatingStartTime: formData.operatingStartTime,
      operatingEndTime: formData.operatingEndTime
    }

    onSubmit(stationData)
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 ' +
    'text-sm text-slate-900 outline-none transition ' +
    'placeholder:text-slate-400 focus:border-slate-500 ' +
    'focus:ring-2 focus:ring-slate-200 ' +
    'disabled:cursor-not-allowed disabled:bg-slate-100'

  const labelClass =
    'mb-1.5 block text-sm font-medium text-slate-700'

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

      {/* =====================================================
          BASIC INFORMATION
      ===================================================== */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-800">
            Station Information
          </h3>

          <p className="mt-0.5 text-xs text-slate-500">
            Enter the station name and physical address.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* STATION NAME */}
          <div>
            <label htmlFor="name" className={labelClass}>
              Station Name
              <span className="ml-1 text-red-500">*</span>
            </label>

            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Example: Kandy Solar Hub"
              required
              disabled={loading}
              className={inputClass}
            />
          </div>

          {/* ADDRESS */}
          <div>
            <label htmlFor="address" className={labelClass}>
              Address
              <span className="ml-1 text-red-500">*</span>
            </label>

            <input
              id="address"
              name="address"
              type="text"
              value={formData.address}
              onChange={handleChange}
              placeholder="Example: Peradeniya Road, Kandy"
              required
              disabled={loading}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          GPS LOCATION
      ===================================================== */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-800">
            GPS Location
          </h3>

          <p className="mt-0.5 text-xs text-slate-500">
            Enter the latitude and longitude of the solar station.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* LATITUDE */}
          <div>
            <label htmlFor="latitude" className={labelClass}>
              Latitude
              <span className="ml-1 text-red-500">*</span>
            </label>

            <input
              id="latitude"
              name="latitude"
              type="number"
              step="any"
              min="-90"
              max="90"
              value={formData.latitude}
              onChange={handleChange}
              placeholder="7.2906"
              required
              disabled={loading}
              className={inputClass}
            />

            <p className="mt-1 text-xs text-slate-500">
              Between -90 and 90
            </p>
          </div>

          {/* LONGITUDE */}
          <div>
            <label htmlFor="longitude" className={labelClass}>
              Longitude
              <span className="ml-1 text-red-500">*</span>
            </label>

            <input
              id="longitude"
              name="longitude"
              type="number"
              step="any"
              min="-180"
              max="180"
              value={formData.longitude}
              onChange={handleChange}
              placeholder="80.6337"
              required
              disabled={loading}
              className={inputClass}
            />

            <p className="mt-1 text-xs text-slate-500">
              Between -180 and 180
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          CAPACITY + OPERATING SCHEDULE
      ===================================================== */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-800">
            Capacity & Operating Schedule
          </h3>

          <p className="mt-0.5 text-xs text-slate-500">
            Enter the station capacity and daily operating hours.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          {/* CAPACITY */}
          <div>
            <label htmlFor="capacityKwh" className={labelClass}>
              Capacity
              <span className="ml-1 text-red-500">*</span>
            </label>

            <div className="relative">
              <input
                id="capacityKwh"
                name="capacityKwh"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.capacityKwh}
                onChange={handleChange}
                placeholder="500"
                required
                disabled={loading}
                className={`${inputClass} pr-14`}
              />

              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-400">
                kWh
              </span>
            </div>
          </div>

          {/* START TIME */}
          <div>
            <label
              htmlFor="operatingStartTime"
              className={labelClass}
            >
              Start Time
              <span className="ml-1 text-red-500">*</span>
            </label>

            <input
              id="operatingStartTime"
              name="operatingStartTime"
              type="time"
              value={formData.operatingStartTime}
              onChange={handleChange}
              required
              disabled={loading}
              className={inputClass}
            />
          </div>

          {/* END TIME */}
          <div>
            <label
              htmlFor="operatingEndTime"
              className={labelClass}
            >
              End Time
              <span className="ml-1 text-red-500">*</span>
            </label>

            <input
              id="operatingEndTime"
              name="operatingEndTime"
              type="time"
              value={formData.operatingEndTime}
              onChange={handleChange}
              required
              disabled={loading}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          BUTTONS
      ===================================================== */}
      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">

        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? isEditing
              ? 'Saving...'
              : 'Creating...'
            : isEditing
              ? 'Save Changes'
              : 'Create Station'}
        </button>
      </div>
    </form>
  )
}