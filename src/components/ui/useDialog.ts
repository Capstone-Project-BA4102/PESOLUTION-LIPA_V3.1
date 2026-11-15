import { useEffect, useRef, type RefObject } from 'react'

const layers: symbol[] = []
let previousOverflow = ''
const focusable = 'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])'

/** Shared keyboard, scroll lock and focus restoration for stacked dialogs/drawers. */
export function useDialog(open: boolean, panel: RefObject<HTMLElement | null>, onClose: () => void, dismissible = true) {
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose }, [onClose])
  useEffect(() => {
    if (!open) return
    const layer = Symbol('dialog')
    const previousFocus = document.activeElement as HTMLElement | null
    if (!layers.length) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden' }
    layers.push(layer)
    const elements = () => Array.from(panel.current?.querySelectorAll<HTMLElement>(focusable) || []).filter(node => node.tabIndex >= 0 && !node.matches(':disabled') && node.getClientRects().length && getComputedStyle(node).visibility === 'visible' && !node.closest('[inert]'))
    const ownsPopup = (active: Element | null) => {
      const popup = active?.closest('[data-searchable-select-popup]')
      const listId = popup?.querySelector('[role="listbox"]')?.id
      return !!listId && !!panel.current?.querySelector(`[aria-controls="${CSS.escape(listId)}"]`)
    }
    const focusFirst = () => (elements()[0] || panel.current)?.focus({ preventScroll: true })
    const isTop = () => layers.at(-1) === layer
    const frame = requestAnimationFrame(() => {
      if (!isTop() || panel.current?.contains(document.activeElement)) return
      // A child dropdown can already have focused its portaled search field.
      const active = document.activeElement
      if (ownsPopup(active)) return
      focusFirst()
    })
    const keydown = (event: KeyboardEvent) => {
      if (!isTop()) return
      // A portaled searchable select owns Escape and keyboard navigation while open.
      const active = document.activeElement
      if (active instanceof Element && !panel.current?.contains(active)) {
        if (ownsPopup(active)) return
      }
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); if (dismissible) close.current(); return }
      if (event.key !== 'Tab') return
      const nodes = elements()
      const first = nodes[0], last = nodes.at(-1)
      if (!first) { event.preventDefault(); panel.current?.focus(); return }
      if (event.shiftKey && (active === first || !panel.current?.contains(active))) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (active === last || !panel.current?.contains(active))) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown, true)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', keydown, true)
      const wasTop = isTop()
      layers.splice(layers.indexOf(layer), 1)
      if (!layers.length) document.body.style.overflow = previousOverflow
      if (wasTop && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [open, panel, dismissible])
}
