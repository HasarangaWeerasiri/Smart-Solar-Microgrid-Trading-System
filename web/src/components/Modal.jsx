/*
 * File: Modal.jsx
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-23
 * Description: Reusable pop-up used for the add and edit forms and for confirming an action.
 *              Closes on the Escape key or a click on the dark background.
 *              (Focus trap added by Member D, 2026-09-28: Tab/Shift+Tab now cycle only through
 *              the dialog's own focusable elements, and focus returns to whatever opened the
 *              dialog when it closes, so keyboard users are never dropped back onto the page
 *              behind it. Purely additive - every existing caller keeps working unchanged.)
 */

import { useEffect, useRef } from 'react'

/**
 * Returns every element inside a container that a keyboard user can currently tab to.
 */
function getFocusableElements(container) {
  if (!container) {
    return []
  }

  const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  return Array.from(container.querySelectorAll(selector)).filter(
    (element) => !element.disabled && element.offsetParent !== null
  )
}

/**
 * Draws a centred dialog over the page.
 * Pass the form or message as children, and the buttons as footer.
 */
export default function Modal({ title, description, children, footer, onClose }) {
  const dialogRef = useRef(null)

  // Escape closes the dialog. Tab/Shift+Tab are trapped inside it so focus can never land back
  // on the page behind the dark background. Focus returns to the trigger element on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement
    getFocusableElements(dialogRef.current)[0]?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusable = getFocusableElements(dialogRef.current)
      if (focusable.length === 0) {
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      {/* Dark background. Clicking it closes the dialog. */}
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className="relative z-10 my-auto w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
        </div>

        <div className="px-5 py-4">{children}</div>

        {footer && (
          <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>
        )}
      </div>
    </div>
  )
}
