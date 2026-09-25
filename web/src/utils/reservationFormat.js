/*
 * File: reservationFormat.js
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: IT23245556 Hasaranga Weerasiri
 * Created: 2026-09-25
 * Description: Display helpers for reservation times. The API sends every time in UTC (ending
 *              in "Z"); these turn them into the viewer's local time for display only. No
 *              booking rule is worked out here.
 */

/**
 * Shows a date and time, for example "Fri 26 Sep, 08:00". Returns "-" when there is no value.
 */
export function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Shows a slot's time window, for example "Fri 26 Sep, 08:00 - 09:00".
 */
export function formatTimeRange(start, end) {
  if (!start) {
    return '-'
  }

  const endText = end
    ? new Date(end).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : ''

  return endText ? `${formatDateTime(start)} - ${endText}` : formatDateTime(start)
}

/**
 * Returns the local calendar day of a time as "YYYY-MM-DD", the same format a date box uses.
 * Local time is used so a slot is matched to the day the user sees on screen.
 */
export function toLocalDateKey(value) {
  const date = new Date(value)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * Says roughly how far away a time is, for example "in 2 days", "in 5 hours" or "3 hours ago".
 */
export function formatRelative(value) {
  if (!value) {
    return ''
  }

  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60000)
  const absolute = Math.abs(minutes)

  let amount
  if (absolute < 60) {
    amount = `${absolute} minute${absolute === 1 ? '' : 's'}`
  } else if (absolute < 60 * 48) {
    const hours = Math.round(absolute / 60)
    amount = `${hours} hour${hours === 1 ? '' : 's'}`
  } else {
    const days = Math.round(absolute / (60 * 24))
    amount = `${days} day${days === 1 ? '' : 's'}`
  }

  return minutes >= 0 ? `in ${amount}` : `${amount} ago`
}
