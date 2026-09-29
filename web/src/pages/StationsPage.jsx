import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Modal from '../components/Modal'
import StationForm from '../components/StationForm'
import StatusBadge from '../components/StatusBadge'

import {
  getStations,
  getStationById,
  createStation,
  updateStation,
  activateStation,
  deactivateStation
} from '../api/stations'

import { getSlotsByStation } from '../api/slots'

import {
  exportStationPdf,
  exportStationCsv,
  exportAllStationsPdf
} from '../utils/stationExport'


export default function StationsPage() {
  const navigate = useNavigate()

  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [selectedStation, setSelectedStation] = useState(null)
  const [saving, setSaving] = useState(false)

  const [confirmStation, setConfirmStation] = useState(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState('')

  const [downloadStation, setDownloadStation] = useState(null)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  const [downloadAllLoading, setDownloadAllLoading] = useState(false)


  useEffect(() => {
    loadStations()
  }, [])


  // ============================================================
  // LOAD STATIONS
  // ============================================================

  async function loadStations() {
    setLoading(true)
    setPageError('')

    try {
      const data = await getStations()

      setStations(
        Array.isArray(data)
          ? data
          : []
      )
    } catch (error) {
      setPageError(
        error.message ||
        'Unable to load stations.'
      )
    } finally {
      setLoading(false)
    }
  }


  // ============================================================
  // CREATE / EDIT STATION
  // ============================================================

  function openCreateModal() {
    setSelectedStation(null)
    setFormError('')
    setShowForm(true)
  }


  function openEditModal(station) {
    setSelectedStation(station)
    setFormError('')
    setShowForm(true)
  }


  function closeFormModal() {
    if (saving) return

    setShowForm(false)
    setSelectedStation(null)
    setFormError('')
  }


  async function handleStationSubmit(stationData) {
    setSaving(true)
    setFormError('')

    try {
      if (selectedStation) {
        await updateStation(
          selectedStation.id,
          stationData
        )
      } else {
        await createStation(stationData)
      }

      setShowForm(false)
      setSelectedStation(null)

      await loadStations()
    } catch (error) {
      setFormError(
        error.message ||
        'Unable to save station.'
      )
    } finally {
      setSaving(false)
    }
  }


  // ============================================================
  // ACTIVATE / DEACTIVATE STATION
  // ============================================================

  function requestStatusChange(station) {
    setStatusError('')
    setConfirmStation(station)
  }


  function closeStatusModal() {
    if (statusLoading) return

    setConfirmStation(null)
    setStatusError('')
  }


  async function handleStatusChange() {
    if (!confirmStation) return

    setStatusLoading(true)
    setStatusError('')

    try {
      if (confirmStation.status === 'Active') {
        await deactivateStation(
          confirmStation.id
        )
      } else {
        await activateStation(
          confirmStation.id
        )
      }

      setConfirmStation(null)

      await loadStations()
    } catch (error) {
      setStatusError(
        error.message ||
        'Unable to update station status.'
      )
    } finally {
      setStatusLoading(false)
    }
  }


  // ============================================================
  // OPEN STATION SLOTS
  // ============================================================

  function openSlots(station) {
    navigate(
      `/backoffice/stations/${station.id}/slots`
    )
  }


  // ============================================================
  // INDIVIDUAL DOWNLOAD
  // ============================================================

  function openDownloadModal(station) {
    setDownloadStation(station)
    setDownloadError('')
  }


  function closeDownloadModal() {
    if (downloadLoading) return

    setDownloadStation(null)
    setDownloadError('')
  }


  async function handleDownload(format) {
    if (!downloadStation) return

    setDownloadLoading(true)
    setDownloadError('')

    try {
      const [station, slots] =
        await Promise.all([
          getStationById(
            downloadStation.id
          ),

          getSlotsByStation(
            downloadStation.id
          )
        ])

      const slotList =
        Array.isArray(slots)
          ? slots
          : []

      if (format === 'pdf') {
        exportStationPdf(
          station,
          slotList
        )
      } else {
        exportStationCsv(
          station,
          slotList
        )
      }

      setDownloadStation(null)
    } catch (error) {
      setDownloadError(
        error.message ||
        'Unable to generate the station report.'
      )
    } finally {
      setDownloadLoading(false)
    }
  }


  // ============================================================
  // DOWNLOAD ALL
  // ============================================================

  async function handleDownloadAll() {
    if (stations.length === 0) {
      setPageError(
        'There are no stations available to download.'
      )

      return
    }

    setDownloadAllLoading(true)
    setPageError('')

    try {
      /*
       * Get the latest station information and slots
       * for every registered station.
       */
      const reports =
        await Promise.all(
          stations.map(
            async (stationItem) => {
              const [station, slots] =
                await Promise.all([
                  getStationById(
                    stationItem.id
                  ),

                  getSlotsByStation(
                    stationItem.id
                  )
                ])

              return {
                station,

                slots: Array.isArray(slots)
                  ? slots
                  : []
              }
            }
          )
        )

      exportAllStationsPdf(reports)
    } catch (error) {
      setPageError(
        error.message ||
        'Unable to generate the complete stations report.'
      )
    } finally {
      setDownloadAllLoading(false)
    }
  }


  // ============================================================
  // SEARCH
  // ============================================================

  const filteredStations = useMemo(() => {
    const query =
      search.trim().toLowerCase()

    if (!query) return stations

    return stations.filter((station) => {
      return (
        station.name
          ?.toLowerCase()
          .includes(query) ||

        station.address
          ?.toLowerCase()
          .includes(query) ||

        station.status
          ?.toLowerCase()
          .includes(query)
      )
    })
  }, [stations, search])


  // ============================================================
  // UI
  // ============================================================

  return (
    <div>

      {/* ==================================================
          PAGE HEADER
      ================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Microgrid Stations
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Manage solar microgrid stations, GPS locations,
            capacity and operating schedules.
          </p>
        </div>


        {/* HEADER ACTIONS */}

        <div className="flex flex-wrap items-center gap-2">

          {/* DOWNLOAD ALL */}

          <button
            type="button"
            onClick={handleDownloadAll}
            disabled={
              downloadAllLoading ||
              loading ||
              stations.length === 0
            }
            className="
              inline-flex h-10 items-center justify-center gap-2
              rounded-lg
              border border-amber-300
              bg-amber-50
              px-4
              text-sm font-semibold
              text-amber-800
              shadow-sm
              transition
              hover:border-amber-400
              hover:bg-amber-100
              focus:outline-none
              focus:ring-2
              focus:ring-amber-200
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {downloadAllLoading ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
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

                Preparing...
              </>
            ) : (
              <>
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
                  <path d="M12 3v12" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>

                Download All
              </>
            )}
          </button>


          {/* ADD STATION */}

          <button
            type="button"
            onClick={openCreateModal}
            className="
              inline-flex h-10 items-center justify-center
              rounded-lg
              bg-slate-900
              px-4
              text-sm font-semibold
              text-white
              shadow-sm
              transition
              hover:bg-slate-800
            "
          >
            <span className="mr-2 text-lg leading-none">
              +
            </span>

            Add Station
          </button>

        </div>
      </div>


      {/* ==================================================
          ERROR
      ================================================== */}

      {pageError && (
        <div
          role="alert"
          className="
            mt-5 flex items-start justify-between gap-4
            rounded-lg
            border border-red-200
            bg-red-50
            px-4 py-3
            text-sm text-red-700
          "
        >
          <div>
            <span className="font-semibold">
              Error:{' '}
            </span>

            {pageError}
          </div>

          <button
            type="button"
            onClick={() => setPageError('')}
            className="font-semibold text-red-500 hover:text-red-700"
            aria-label="Close error"
          >
            ×
          </button>
        </div>
      )}


      {/* ==================================================
          SEARCH TOOLBAR
      ================================================== */}

      <div className="
        mt-6 flex flex-col gap-3
        rounded-xl
        border border-slate-200
        bg-white
        p-4
        shadow-sm
        sm:flex-row
        sm:items-center
        sm:justify-between
      ">

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
            className="
              pointer-events-none
              absolute left-3 top-1/2
              h-5 w-5
              -translate-y-1/2
              text-slate-400
            "
          >
            <circle
              cx="11"
              cy="11"
              r="8"
            />

            <path d="m21 21-4.35-4.35" />
          </svg>

          <input
            type="search"
            placeholder="Search by station, address or status..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            className="
              w-full
              rounded-lg
              border border-slate-300
              bg-white
              py-2.5
              pl-10
              pr-3
              text-sm
              text-slate-900
              outline-none
              transition
              placeholder:text-slate-400
              focus:border-slate-500
              focus:ring-2
              focus:ring-slate-200
            "
          />

        </div>


        <button
          type="button"
          onClick={loadStations}
          disabled={loading}
          className="
            h-10
            rounded-lg
            border border-slate-300
            bg-white
            px-4
            text-sm font-medium
            text-slate-700
            transition
            hover:bg-slate-50
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {loading
            ? 'Refreshing...'
            : 'Refresh'}
        </button>

      </div>


      {/* ==================================================
          STATIONS TABLE
      ================================================== */}

      <div className="
        mt-4
        overflow-hidden
        rounded-xl
        border border-slate-200
        bg-white
        shadow-sm
      ">

        {/* TABLE TITLE */}

        <div className="border-b border-slate-200 px-5 py-4">

          <h2 className="font-semibold text-slate-900">
            Registered Stations
          </h2>

          <p className="mt-0.5 text-sm text-slate-500">
            {filteredStations.length}{' '}
            {filteredStations.length === 1
              ? 'station'
              : 'stations'}{' '}
            found
          </p>

        </div>


        {/* LOADING */}

        {loading ? (

          <div className="px-6 py-16 text-center">
            <div className="text-sm font-medium text-slate-600">
              Loading stations...
            </div>
          </div>

        ) : filteredStations.length === 0 ? (

          /* EMPTY */

          <div className="px-6 py-16 text-center">

            <div className="
              mx-auto
              flex h-12 w-12
              items-center justify-center
              rounded-full
              bg-slate-100
              text-xl
            ">
              &#9728;
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No stations found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {search
                ? 'No stations match your search.'
                : 'No microgrid stations have been registered yet.'}
            </p>

            {!search && (
              <button
                type="button"
                onClick={openCreateModal}
                className="
                  mt-4 rounded-lg
                  bg-slate-900
                  px-4 py-2
                  text-sm font-medium
                  text-white
                  transition
                  hover:bg-slate-800
                "
              >
                + Add First Station
              </button>
            )}

          </div>

        ) : (

          /*
           * IMPORTANT:
           * No min-w-[1250px].
           *
           * table-fixed allows the table to stay inside
           * the available content width.
           */

          <div className="w-full overflow-hidden">

            <table className="w-full table-fixed text-left">

              {/* ==========================================
                  TABLE HEADER
              ========================================== */}

              <thead className="bg-slate-50">

                <tr className="border-b border-slate-200">

                  <th className="
                    w-[17%]
                    px-4 py-3
                    text-xs font-semibold
                    uppercase tracking-wide
                    text-slate-500
                  ">
                    Station
                  </th>

                  <th className="
                    w-[19%]
                    px-4 py-3
                    text-xs font-semibold
                    uppercase tracking-wide
                    text-slate-500
                  ">
                    Location
                  </th>

                  <th className="
                    w-[11%]
                    px-3 py-3
                    text-xs font-semibold
                    uppercase tracking-wide
                    text-slate-500
                  ">
                    GPS
                  </th>

                  <th className="
                    w-[9%]
                    px-3 py-3
                    text-xs font-semibold
                    uppercase tracking-wide
                    text-slate-500
                  ">
                    Capacity
                  </th>

                  <th className="
                    w-[12%]
                    px-3 py-3
                    text-xs font-semibold
                    uppercase tracking-wide
                    text-slate-500
                  ">
                    Operating Hours
                  </th>

                  <th className="
                    w-[9%]
                    px-3 py-3
                    text-xs font-semibold
                    uppercase tracking-wide
                    text-slate-500
                  ">
                    Status
                  </th>

                  <th className="
                    w-[21%]
                    px-2 py-3
                    text-center
                    text-xs font-semibold
                    uppercase tracking-wide
                    text-slate-500
                  ">
                    Actions
                  </th>

                </tr>

              </thead>


              {/* ==========================================
                  TABLE BODY
              ========================================== */}

              <tbody className="divide-y divide-slate-100">

                {filteredStations.map((station) => (

                  <tr
                    key={station.id}
                    className="
                      transition-colors
                      hover:bg-slate-50/80
                    "
                  >

                    {/* =====================================
                        STATION
                    ===================================== */}

                    <td className="px-4 py-4">

                      <div className="flex min-w-0 items-center gap-3">

                        {/* SOLAR ICON */}

                        <div className="
                          flex h-10 w-10 shrink-0
                          items-center justify-center
                          rounded-xl
                          bg-amber-100
                          text-amber-600
                        ">

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


                        <div className="min-w-0">

                          <p
                            className="
                              truncate
                              text-sm font-semibold
                              text-slate-900
                            "
                            title={station.name}
                          >
                            {station.name}
                          </p>

                          <p className="
                            mt-0.5 truncate
                            text-xs text-slate-400
                          ">
                            Solar microgrid
                          </p>

                        </div>

                      </div>

                    </td>


                    {/* =====================================
                        LOCATION
                    ===================================== */}

                    <td className="px-4 py-4">

                      <p
                        className="
                          line-clamp-3
                          break-words
                          text-sm
                          leading-5
                          text-slate-600
                        "
                        title={station.address}
                      >
                        {station.address}
                      </p>

                    </td>


                    {/* =====================================
                        GPS
                    ===================================== */}

                    <td className="px-3 py-4">

                      <div className="
                        space-y-0.5
                        text-xs
                        leading-5
                        text-slate-600
                      ">

                        <div
                          className="truncate"
                          title={`Latitude: ${station.latitude}`}
                        >
                          <span className="text-slate-400">
                            Lat:
                          </span>{' '}
                          {station.latitude}
                        </div>

                        <div
                          className="truncate"
                          title={`Longitude: ${station.longitude}`}
                        >
                          <span className="text-slate-400">
                            Lng:
                          </span>{' '}
                          {station.longitude}
                        </div>

                      </div>

                    </td>


                    {/* =====================================
                        CAPACITY
                    ===================================== */}

                    <td className="px-3 py-4">

                      <div className="whitespace-nowrap">

                        <span className="
                          text-sm font-semibold
                          text-slate-800
                        ">
                          {station.capacityKwh}
                        </span>

                        <span className="
                          ml-1
                          text-xs
                          text-slate-500
                        ">
                          kWh
                        </span>

                      </div>

                    </td>


                    {/* =====================================
                        OPERATING HOURS
                    ===================================== */}

                    <td className="px-3 py-4">

                      <div className="
                        inline-flex
                        max-w-full
                        items-center
                        whitespace-nowrap
                        rounded-lg
                        bg-slate-100
                        px-2.5 py-1.5
                        text-xs font-medium
                        text-slate-700
                      ">

                        {station.operatingStartTime}

                        <span className="mx-1.5 text-slate-400">
                          –
                        </span>

                        {station.operatingEndTime}

                      </div>

                    </td>


                    {/* =====================================
                        STATUS
                    ===================================== */}

                    <td className="px-3 py-4">

                      <StatusBadge
                        value={station.status}
                      />

                    </td>
{/* =====================================
    ACTIONS
===================================== */}

<td className="px-2 py-4">

  <div className="flex items-center justify-center gap-1.5">


    {/* =================================
        SLOTS
        Dark blue text button
    ================================= */}
    <button
      type="button"
      onClick={() => openSlots(station)}
      title="Manage booking slots"
      aria-label={`Manage slots for ${station.name}`}
      className="
        inline-flex h-8 shrink-0
        items-center justify-center
        gap-1
        rounded-md
        border border-slate-900
        bg-slate-900
        px-2.5
        text-[11px] font-semibold
        text-white
        shadow-sm
        transition
        hover:bg-slate-800
        hover:border-slate-800
        focus:outline-none
        focus:ring-2
        focus:ring-slate-200
      "
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[14px] w-[14px]"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>

      <span>Slots</span>
    </button>


    {/* =================================
        ACTIVATE / DEACTIVATE
        Same button width for both
    ================================= */}
    <button
      type="button"
      onClick={() => requestStatusChange(station)}
      title={
        station.status === 'Active'
          ? 'Deactivate station'
          : 'Activate station'
      }
      aria-label={
        station.status === 'Active'
          ? `Deactivate ${station.name}`
          : `Activate ${station.name}`
      }
      className={
        station.status === 'Active'
          ? `
              inline-flex h-8 w-[82px] shrink-0
              items-center justify-center
              rounded-md
              border border-red-200
              bg-red-50
              px-2
              text-[11px] font-semibold
              text-red-600
              shadow-sm
              transition
              hover:border-red-300
              hover:bg-red-100
              hover:text-red-700
              focus:outline-none
              focus:ring-2
              focus:ring-red-100
            `
          : `
              inline-flex h-8 w-[82px] shrink-0
              items-center justify-center
              rounded-md
              border border-emerald-200
              bg-emerald-50
              px-2
              text-[11px] font-semibold
              text-emerald-700
              shadow-sm
              transition
              hover:border-emerald-300
              hover:bg-emerald-100
              hover:text-emerald-800
              focus:outline-none
              focus:ring-2
              focus:ring-emerald-100
            `
      }
    >
      {station.status === 'Active'
        ? 'Deactivate'
        : 'Activate'}
    </button>

    {/* =================================
        EDIT
        Small neutral icon button
    ================================= */}
    <button
      type="button"
      onClick={() => openEditModal(station)}
      title="Edit station"
      aria-label={`Edit ${station.name}`}
      className="
        flex h-8 w-8 shrink-0
        items-center justify-center
        rounded-md
        border border-slate-600
        bg-slate-200
        text-slate-600
        shadow-sm
        transition
        hover:border-slate-400
        hover:bg-slate-200
        hover:text-slate-800
        focus:outline-none
        focus:ring-2
        focus:ring-slate-200
      "
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[15px] w-[15px]"
        aria-hidden="true"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </button>



    {/* =================================
        DOWNLOAD
        Gold and always last
    ================================= */}
    <button
      type="button"
      onClick={() => openDownloadModal(station)}
      title="Download station report"
      aria-label={`Download report for ${station.name}`}
      className="
        flex h-8 w-8 shrink-0
        items-center justify-center
        rounded-md
        border border-amber-300
        bg-amber-50
        text-amber-600
        shadow-sm
        transition
        hover:border-amber-400
        hover:bg-amber-100
        hover:text-amber-700
        focus:outline-none
        focus:ring-2
        focus:ring-amber-100
      "
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[15px] w-[15px]"
        aria-hidden="true"
      >
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
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


      {/* ==================================================
          CREATE / EDIT MODAL
      ================================================== */}

      {showForm && (

        <Modal
          title={
            selectedStation
              ? 'Edit Station'
              : 'Add Station'
          }
          description={
            selectedStation
              ? 'Update the station information, GPS location, capacity and operating schedule.'
              : 'Register a new solar microgrid station.'
          }
          onClose={closeFormModal}
        >

          <StationForm
            station={selectedStation}
            onSubmit={handleStationSubmit}
            onCancel={closeFormModal}
            loading={saving}
            error={formError}
          />

        </Modal>

      )}


      {/* ==================================================
          ACTIVATE / DEACTIVATE MODAL
      ================================================== */}

      {confirmStation && (

        <Modal
          title={
            confirmStation.status === 'Active'
              ? 'Deactivate Station'
              : 'Activate Station'
          }
          description={
            confirmStation.status === 'Active'
              ? 'The station will no longer be active.'
              : 'The station will become active again.'
          }
          onClose={closeStatusModal}
          footer={
            <>

              <button
                type="button"
                onClick={closeStatusModal}
                disabled={statusLoading}
                className="
                  rounded-lg
                  border border-slate-300
                  bg-white
                  px-4 py-2
                  text-sm font-medium
                  text-slate-700
                  transition
                  hover:bg-slate-50
                  disabled:opacity-50
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleStatusChange}
                disabled={statusLoading}
                className={
                  confirmStation.status === 'Active'

                    ? `
                      rounded-lg
                      bg-red-600
                      px-4 py-2
                      text-sm font-medium
                      text-white
                      transition
                      hover:bg-red-700
                      disabled:opacity-50
                    `

                    : `
                      rounded-lg
                      bg-emerald-600
                      px-4 py-2
                      text-sm font-medium
                      text-white
                      transition
                      hover:bg-emerald-700
                      disabled:opacity-50
                    `
                }
              >

                {statusLoading
                  ? 'Updating...'
                  : confirmStation.status === 'Active'
                    ? 'Deactivate'
                    : 'Activate'}

              </button>

            </>
          }
        >

          <p className="text-sm text-slate-700">
            Are you sure you want to{' '}

            {confirmStation.status === 'Active'
              ? 'deactivate'
              : 'activate'}{' '}

            <strong>
              {confirmStation.name}
            </strong>
            ?
          </p>


          {confirmStation.status === 'Active' && (

            <div className="
              mt-4
              rounded-lg
              border border-amber-200
              bg-amber-50
              px-3 py-2.5
              text-sm
              text-amber-800
            ">
              The station cannot be deactivated if it
              currently has active reservations.
            </div>

          )}


          {statusError && (

            <div
              role="alert"
              className="
                mt-4
                rounded-lg
                border border-red-200
                bg-red-50
                px-3 py-2.5
                text-sm
                text-red-700
              "
            >
              <span className="font-semibold">
                Error:{' '}
              </span>

              {statusError}
            </div>

          )}

        </Modal>

      )}


      {/* ==================================================
          DOWNLOAD MODAL
      ================================================== */}

      {downloadStation && (

        <Modal
          title="Download Station Report"
          description="Export station information and booking slot details."
          onClose={closeDownloadModal}
        >

          <div>

            {/* STATION SUMMARY */}

            <div className="
              rounded-xl
              border border-slate-200
              bg-slate-50
              p-4
            ">

              <div className="flex items-start justify-between gap-4">

                <div>
                  <p className="font-semibold text-slate-900">
                    {downloadStation.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {downloadStation.address}
                  </p>
                </div>

                <StatusBadge
                  value={downloadStation.status}
                />

              </div>


              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">

                <div>
                  <p className="
                    text-xs font-medium
                    uppercase tracking-wide
                    text-slate-400
                  ">
                    Capacity
                  </p>

                  <p className="mt-1 font-medium text-slate-700">
                    {downloadStation.capacityKwh} kWh
                  </p>
                </div>


                <div>
                  <p className="
                    text-xs font-medium
                    uppercase tracking-wide
                    text-slate-400
                  ">
                    Operating Hours
                  </p>

                  <p className="mt-1 font-medium text-slate-700">
                    {downloadStation.operatingStartTime}
                    {' – '}
                    {downloadStation.operatingEndTime}
                  </p>
                </div>

              </div>

            </div>


            {/* REPORT INFORMATION */}

            <div className="
              mt-4
              rounded-lg
              border border-amber-200
              bg-amber-50
              px-4 py-3
            ">

              <div className="flex gap-3">

                <div className="
                  mt-0.5
                  flex h-8 w-8 shrink-0
                  items-center justify-center
                  rounded-lg
                  bg-amber-100
                  text-amber-700
                ">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 11v5" />
                    <path d="M12 8h.01" />
                  </svg>
                </div>

                <p className="text-sm leading-6 text-amber-900">
                  The report includes station information,
                  GPS coordinates, capacity, operating hours,
                  status and all booking slots belonging to
                  this station.
                </p>

              </div>

            </div>


            {/* DOWNLOAD ERROR */}

            {downloadError && (

              <div
                role="alert"
                className="
                  mt-4
                  rounded-lg
                  border border-red-200
                  bg-red-50
                  px-4 py-3
                  text-sm
                  text-red-700
                "
              >

                <span className="font-semibold">
                  Error:{' '}
                </span>

                {downloadError}

              </div>

            )}


            {/* ==================================================
                EXPORT OPTIONS
            ================================================== */}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">


              {/* PDF */}

              <button
                type="button"
                disabled={downloadLoading}
                onClick={() =>
                  handleDownload('pdf')
                }
                className="
                  group
                  rounded-xl
                  border border-slate-200
                  bg-white
                  p-4
                  text-left
                  shadow-sm
                  transition
                  hover:border-slate-400
                  hover:bg-slate-50
                  hover:shadow-md
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >

                <div className="flex items-center gap-3">

                  <div className="
                    flex h-11 w-11
                    items-center justify-center
                    rounded-lg
                    bg-slate-900
                    text-xs font-bold
                    text-white
                    shadow-sm
                  ">
                    PDF
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      PDF Report
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Professional printable report
                    </p>
                  </div>

                </div>

              </button>


              {/* CSV */}

              <button
                type="button"
                disabled={downloadLoading}
                onClick={() =>
                  handleDownload('csv')
                }
                className="
                  group
                  rounded-xl
                  border border-amber-200
                  bg-amber-50
                  p-4
                  text-left
                  shadow-sm
                  transition
                  hover:border-amber-400
                  hover:bg-amber-100
                  hover:shadow-md
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >

                <div className="flex items-center gap-3">

                  <div className="
                    flex h-11 w-11
                    items-center justify-center
                    rounded-lg
                    bg-amber-500
                    text-xs font-bold
                    text-white
                    shadow-sm
                  ">
                    CSV
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      CSV Export
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Spreadsheet-ready station data
                    </p>
                  </div>

                </div>

              </button>

            </div>


            {/* DOWNLOAD LOADING */}

            {downloadLoading && (

              <div className="
                mt-4
                flex items-center justify-center
                gap-2
                text-sm font-medium
                text-slate-500
              ">

                <svg
                  className="h-4 w-4 animate-spin"
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

                Preparing report...

              </div>

            )}


            {/* CANCEL */}

            <div className="mt-5 flex justify-end">

              <button
                type="button"
                onClick={closeDownloadModal}
                disabled={downloadLoading}
                className="
                  rounded-lg
                  border border-slate-300
                  bg-white
                  px-4 py-2
                  text-sm font-medium
                  text-slate-700
                  transition
                  hover:bg-slate-50
                  disabled:opacity-50
                "
              >
                Cancel
              </button>

            </div>

          </div>

        </Modal>

      )}

    </div>
  )
}