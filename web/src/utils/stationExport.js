/*
 * File: stationExport.js
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23218062 - Sanjula Mohotti
 * Description:
 * Generates professional PDF and CSV reports for individual
 * microgrid stations and a combined PDF report containing
 * all stations and their booking slots.
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'


// ---------------------------------------------------------
// COMMON HELPERS
// ---------------------------------------------------------

function formatDateTime(value) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}


function safeFileName(value) {
  return String(value || 'station')
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}


function addHeader(doc, title, subtitle = '') {
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, pageWidth, 40, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19)
  doc.setTextColor(255, 255, 255)

  doc.text(title, 14, 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(203, 213, 225)

  doc.text(
    'Smart Solar Microgrid Trading System',
    14,
    24
  )

  doc.text(
    'SE4040 - Enterprise Application Development',
    14,
    30
  )

  if (subtitle) {
    doc.setFontSize(8)

    doc.text(
      subtitle,
      pageWidth - 14,
      24,
      { align: 'right' }
    )
  }

  doc.setFontSize(8)

  doc.text(
    `Generated: ${new Date().toLocaleString('en-LK')}`,
    pageWidth - 14,
    30,
    { align: 'right' }
  )
}


function addPageFooters(doc) {
  const pageCount = doc.getNumberOfPages()

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    doc.setDrawColor(226, 232, 240)

    doc.line(
      14,
      pageHeight - 15,
      pageWidth - 14,
      pageHeight - 15
    )

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)

    doc.text(
      'Smart Solar Microgrid Trading System',
      14,
      pageHeight - 9
    )

    doc.text(
      `Page ${page} of ${pageCount}`,
      pageWidth - 14,
      pageHeight - 9,
      { align: 'right' }
    )
  }
}


function getSlotSummary(slots) {
  const active = slots.filter(
    (slot) => slot.status === 'Active'
  ).length

  const available = slots.filter(
    (slot) =>
      slot.status === 'Active' &&
      slot.isAvailable === true
  ).length

  const deactivated = slots.filter(
    (slot) => slot.status === 'Deactivated'
  ).length

  return {
    total: slots.length,
    active,
    available,
    deactivated
  }
}


// ---------------------------------------------------------
// DRAW ONE STATION SECTION
// Used by individual report
// ---------------------------------------------------------

function drawStationInformation(
  doc,
  station,
  slots,
  startY = 50
) {
  const pageWidth = doc.internal.pageSize.getWidth()

  // Station name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(15, 23, 42)

  doc.text(
    station.name || 'Unnamed Station',
    14,
    startY
  )

  // Address
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)

  const addressLines = doc.splitTextToSize(
    station.address || 'No address available',
    130
  )

  doc.text(
    addressLines,
    14,
    startY + 7
  )

  // Status badge
  const isActive = station.status === 'Active'

  if (isActive) {
    doc.setFillColor(220, 252, 231)
    doc.setTextColor(21, 128, 61)
  } else {
    doc.setFillColor(254, 226, 226)
    doc.setTextColor(185, 28, 28)
  }

  doc.roundedRect(
    pageWidth - 43,
    startY - 6,
    29,
    9,
    2,
    2,
    'F'
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)

  doc.text(
    station.status || 'Unknown',
    pageWidth - 28.5,
    startY,
    { align: 'center' }
  )

  const informationY =
    startY + Math.max(19, addressLines.length * 5 + 11)

  // Station Information title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)

  doc.text(
    'Station Information',
    14,
    informationY
  )

  autoTable(doc, {
    startY: informationY + 5,

    body: [
      [
        'Station Name',
        station.name || '-',
        'Capacity',
        `${station.capacityKwh ?? '-'} kWh`
      ],
      [
        'Address',
        station.address || '-',
        'Status',
        station.status || '-'
      ],
      [
        'Latitude',
        station.latitude ?? '-',
        'Longitude',
        station.longitude ?? '-'
      ],
      [
        'Operating Start',
        station.operatingStartTime || '-',
        'Operating End',
        station.operatingEndTime || '-'
      ]
    ],

    theme: 'grid',

    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 3.3,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      textColor: [51, 65, 85],
      valign: 'middle'
    },

    columnStyles: {
      0: {
        fontStyle: 'bold',
        fillColor: [248, 250, 252],
        textColor: [71, 85, 105],
        cellWidth: 32
      },

      1: {
        cellWidth: 62
      },

      2: {
        fontStyle: 'bold',
        fillColor: [248, 250, 252],
        textColor: [71, 85, 105],
        cellWidth: 32
      },

      3: {
        cellWidth: 56
      }
    },

    margin: {
      left: 14,
      right: 14
    }
  })

  const summary = getSlotSummary(slots)

  let currentY = doc.lastAutoTable.finalY + 12

  // Slot summary
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)

  doc.text(
    'Booking Slot Summary',
    14,
    currentY
  )

  autoTable(doc, {
    startY: currentY + 5,

    head: [
      [
        'Total Slots',
        'Active',
        'Available',
        'Deactivated'
      ]
    ],

    body: [
      [
        String(summary.total),
        String(summary.active),
        String(summary.available),
        String(summary.deactivated)
      ]
    ],

    theme: 'grid',

    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },

    bodyStyles: {
      halign: 'center',
      fontStyle: 'bold',
      fontSize: 10,
      textColor: [15, 23, 42]
    },

    styles: {
      font: 'helvetica',
      cellPadding: 3.3,
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },

    margin: {
      left: 14,
      right: 14
    }
  })

  currentY = doc.lastAutoTable.finalY + 12

  // Slot details
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)

  doc.text(
    'Booking Slot Details',
    14,
    currentY
  )

  if (slots.length === 0) {
    autoTable(doc, {
      startY: currentY + 5,

      body: [
        [
          'No booking slots have been created for this station.'
        ]
      ],

      theme: 'grid',

      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 6,
        textColor: [100, 116, 139],
        halign: 'center',
        fillColor: [248, 250, 252],
        lineColor: [226, 232, 240]
      },

      margin: {
        left: 14,
        right: 14,
        bottom: 23
      }
    })

    return
  }

  const rows = slots.map((slot, index) => [
    index + 1,
    slot.slotName || '-',
    formatDateTime(slot.startTime),
    formatDateTime(slot.endTime),
    slot.isAvailable
      ? 'Available'
      : 'Unavailable',
    slot.status || '-'
  ])

  autoTable(doc, {
    startY: currentY + 5,

    head: [
      [
        '#',
        'Slot',
        'Start Time',
        'End Time',
        'Availability',
        'Status'
      ]
    ],

    body: rows,

    theme: 'grid',

    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },

    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2.7,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      textColor: [51, 65, 85],
      valign: 'middle'
    },

    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },

    columnStyles: {
      0: {
        halign: 'center',
        cellWidth: 8
      },

      1: {
        cellWidth: 31
      },

      2: {
        cellWidth: 42
      },

      3: {
        cellWidth: 42
      },

      4: {
        halign: 'center',
        cellWidth: 29
      },

      5: {
        halign: 'center',
        cellWidth: 27
      }
    },

    margin: {
      left: 14,
      right: 14,
      bottom: 23
    }
  })
}


// ---------------------------------------------------------
// INDIVIDUAL STATION PDF
// ---------------------------------------------------------

export function exportStationPdf(
  station,
  slots = []
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  addHeader(
    doc,
    'Microgrid Station Report',
    'Individual Station Report'
  )

  drawStationInformation(
    doc,
    station,
    slots,
    53
  )

  addPageFooters(doc)

  const fileName =
    `${safeFileName(station.name)}_Station_Report.pdf`

  doc.save(fileName)
}


// ---------------------------------------------------------
// ALL STATIONS PDF
// ---------------------------------------------------------

export function exportAllStationsPdf(
  stationReports = []
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  // -------------------------------------------------------
  // COVER
  // -------------------------------------------------------

  addHeader(
    doc,
    'Microgrid Stations Report',
    'Complete System Report'
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(23)
  doc.setTextColor(15, 23, 42)

  doc.text(
    'All Registered Stations',
    14,
    66
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)

  doc.text(
    'Complete station information and booking slot details',
    14,
    74
  )

  const activeStations = stationReports.filter(
    ({ station }) =>
      station.status === 'Active'
  ).length

  const deactivatedStations =
    stationReports.length - activeStations

  const totalSlots = stationReports.reduce(
    (total, item) =>
      total + item.slots.length,
    0
  )

  const availableSlots = stationReports.reduce(
    (total, item) =>
      total +
      item.slots.filter(
        (slot) =>
          slot.status === 'Active' &&
          slot.isAvailable === true
      ).length,
    0
  )

  // System summary
  autoTable(doc, {
    startY: 88,

    head: [
      [
        'Total Stations',
        'Active Stations',
        'Deactivated',
        'Total Slots',
        'Available Slots'
      ]
    ],

    body: [
      [
        stationReports.length,
        activeStations,
        deactivatedStations,
        totalSlots,
        availableSlots
      ]
    ],

    theme: 'grid',

    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8
    },

    bodyStyles: {
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 11,
      textColor: [15, 23, 42]
    },

    styles: {
      cellPadding: 4,
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },

    margin: {
      left: 14,
      right: 14
    }
  })

  let currentY =
    doc.lastAutoTable.finalY + 15

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)

  doc.text(
    'Station Overview',
    14,
    currentY
  )

  const overviewRows =
    stationReports.map(
      ({ station, slots }, index) => [
        index + 1,
        station.name || '-',
        station.address || '-',
        `${station.capacityKwh ?? '-'} kWh`,
        station.status || '-',
        slots.length
      ]
    )

  autoTable(doc, {
    startY: currentY + 5,

    head: [
      [
        '#',
        'Station',
        'Location',
        'Capacity',
        'Status',
        'Slots'
      ]
    ],

    body: overviewRows,

    theme: 'grid',

    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },

    styles: {
      fontSize: 7.5,
      cellPadding: 2.8,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      textColor: [51, 65, 85],
      valign: 'middle'
    },

    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },

    columnStyles: {
      0: {
        cellWidth: 8,
        halign: 'center'
      },

      1: {
        cellWidth: 34
      },

      2: {
        cellWidth: 61
      },

      3: {
        cellWidth: 26
      },

      4: {
        cellWidth: 29
      },

      5: {
        cellWidth: 20,
        halign: 'center'
      }
    },

    margin: {
      left: 14,
      right: 14,
      bottom: 23
    }
  })

  // -------------------------------------------------------
  // ONE STATION PER SECTION
  // -------------------------------------------------------

  stationReports.forEach(
    ({ station, slots }, index) => {
      doc.addPage()

      addHeader(
        doc,
        'Microgrid Station Details',
        `Station ${index + 1} of ${stationReports.length}`
      )

      drawStationInformation(
        doc,
        station,
        slots,
        53
      )
    }
  )

  addPageFooters(doc)

  doc.save(
    'All_Microgrid_Stations_Report.pdf'
  )
}


// ---------------------------------------------------------
// CSV HELPERS
// ---------------------------------------------------------

function escapeCsv(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return ''
  }

  const stringValue = String(value)

  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}


// ---------------------------------------------------------
// INDIVIDUAL CSV
// ---------------------------------------------------------

export function exportStationCsv(
  station,
  slots = []
) {
  const headers = [
    'Station Name',
    'Address',
    'Latitude',
    'Longitude',
    'Capacity (kWh)',
    'Operating Start',
    'Operating End',
    'Station Status',
    'Slot Name',
    'Slot Start',
    'Slot End',
    'Slot Availability',
    'Slot Status'
  ]

  let rows

  if (slots.length === 0) {
    rows = [
      [
        station.name,
        station.address,
        station.latitude,
        station.longitude,
        station.capacityKwh,
        station.operatingStartTime,
        station.operatingEndTime,
        station.status,
        '',
        '',
        '',
        '',
        ''
      ]
    ]
  } else {
    rows = slots.map((slot) => [
      station.name,
      station.address,
      station.latitude,
      station.longitude,
      station.capacityKwh,
      station.operatingStartTime,
      station.operatingEndTime,
      station.status,
      slot.slotName,
      formatDateTime(slot.startTime),
      formatDateTime(slot.endTime),
      slot.isAvailable
        ? 'Available'
        : 'Unavailable',
      slot.status
    ])
  }

  const csv = [
    headers.map(escapeCsv).join(','),

    ...rows.map((row) =>
      row.map(escapeCsv).join(',')
    )
  ].join('\r\n')

  const blob = new Blob(
    ['\uFEFF', csv],
    {
      type: 'text/csv;charset=utf-8;'
    }
  )

  const url =
    URL.createObjectURL(blob)

  const link =
    document.createElement('a')

  link.href = url

  link.download =
    `${safeFileName(station.name)}_Station_Report.csv`

  document.body.appendChild(link)

  link.click()

  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}