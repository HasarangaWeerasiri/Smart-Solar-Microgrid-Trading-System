/*
 * File: StatusBadge.jsx
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-23
 * Description: Small coloured label for an account status or a role, so the state of a row
 *              is obvious at a glance in the management tables.
 */

// One colour per account status. Anything unknown falls back to grey.
const STATUS_STYLES = {
  Active: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  Pending: 'bg-amber-100 text-amber-800 ring-amber-200',
  Deactivated: 'bg-red-100 text-red-800 ring-red-200'
}

const DEFAULT_STYLE = 'bg-slate-100 text-slate-700 ring-slate-200'

/**
 * Draws the status (or any short label) as a coloured pill.
 */
export default function StatusBadge({ value }) {
  const style = STATUS_STYLES[value] ?? DEFAULT_STYLE

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {value}
    </span>
  )
}
