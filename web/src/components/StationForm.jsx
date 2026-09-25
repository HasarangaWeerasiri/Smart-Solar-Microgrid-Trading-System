import { useEffect, useState } from 'react'
import StationLocationMap from './StationLocationMap'

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
  const [showMap, setShowMap] = useState(false)
  const [detectedAddress, setDetectedAddress] = useState('')
  const [fetchingAddress, setFetchingAddress] = useState(false)
  const [addressError, setAddressError] = useState('')

  const isEditing = Boolean(station)

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

    setShowMap(false)
  }, [station])

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value
    }))
  }

    async function handleLocationSelect(latitude, longitude) {
    const formattedLatitude = latitude.toFixed(6)
    const formattedLongitude = longitude.toFixed(6)

    // Immediately update coordinates
    setFormData((current) => ({
        ...current,
        latitude: formattedLatitude,
        longitude: formattedLongitude
    }))

    setFetchingAddress(true)
    setAddressError('')
    setDetectedAddress('')

    try {
        const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
            headers: {
            Accept: 'application/json'
            }
        }
        )

        if (!response.ok) {
        throw new Error('Could not fetch address')
        }

        const data = await response.json()

        const address =
        data.display_name ||
        'Address not available for this location'

        setDetectedAddress(address)

        // Automatically put detected address into editable Address field
        setFormData((current) => ({
         ...current,
        address: address
        }))
    } catch (error) {
        console.error('Reverse geocoding error:', error)

        setAddressError(
        'Could not automatically detect the address. Please enter it manually.'
        )
    } finally {
        setFetchingAddress(false)
    }
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

        {/* GPS HEADER */}
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              GPS Location
            </h3>

            <p className="mt-0.5 text-xs text-slate-500">
              Enter the coordinates manually or select the station location
              from the map.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowMap((current) => !current)}
            disabled={loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {/* MAP PIN ICON */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>

            {showMap ? 'Hide Map' : 'Select on Map'}
          </button>
        </div>

        {/* MAP */}
        {showMap && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">

            <div className="mb-3 flex items-start gap-2">

              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5" />
                <path d="M12 8h.01" />
              </svg>

              <p className="text-xs text-slate-600">
                Click anywhere on the map to select the station location.
                You can also drag the marker to adjust the position.
              </p>
            </div>

            <StationLocationMap
              latitude={formData.latitude}
              longitude={formData.longitude}
              onLocationSelect={handleLocationSelect}
            />

            {/* DETECTED ADDRESS */}
            <div className="mt-3">

                {fetchingAddress && (
                    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                        <svg
                            className="h-4 w-4 animate-spin text-blue-600"
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                        <circle
                            cx="12"
                            cy="12"
                            r="9"
                            stroke="currentColor"
                            strokeWidth="3"
                            className="opacity-25"
                        />

                        <path
                            d="M21 12a9 9 0 0 0-9-9"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                    </svg>

                <span className="text-xs font-medium text-blue-700">
                    Finding address...
                </span>
            </div>
  )}

  {!fetchingAddress && detectedAddress && (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">

      <div className="flex items-start gap-2">

        {/* Location icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
        >
          <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>

        <div className="min-w-0">

          <p className="text-xs font-semibold text-emerald-800">
            Detected Address
          </p>

          <p className="mt-1 text-sm leading-5 text-slate-700">
            {detectedAddress}
          </p>

        </div>
      </div>

      <p className="mt-2 border-t border-emerald-200 pt-2 text-xs text-slate-500">
        The address was detected from the selected map location.
        You can edit the Address field above if it is not correct.
      </p>

    </div>
  )}

  {addressError && (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
      <p className="text-xs text-amber-800">
        {addressError}
      </p>
    </div>
  )}

</div>

            {formData.latitude !== '' &&
              formData.longitude !== '' && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="font-medium text-slate-700">
                    Selected:
                  </span>

                  <span className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200">
                    Lat: {formData.latitude}
                  </span>

                  <span className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200">
                    Lng: {formData.longitude}
                  </span>
                </div>
              )}
          </div>
        )}

        {/* LATITUDE + LONGITUDE */}
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