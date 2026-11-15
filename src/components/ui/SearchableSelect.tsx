import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { Field, formControlClassName } from './Form'
import { usePT } from '@/lib/portalCopy'
import { cn } from '@/lib/utils'

type Option = string | { value: string; label: string; keywords?: string }
const searchable = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()

/** Same closed-control styling as Select, with an accessible searchable popup. */
export function SearchableSelect({ label, ariaLabel, options, value, onChange, placeholder = 'Select an option', hint, required = false, allowCustomValue = false, className }: {
  label?: string; ariaLabel?: string; options: Option[]; value: string; onChange: (value: string) => void;
  placeholder?: string; hint?: string; required?: boolean; allowCustomValue?: boolean; className?: string
}) {
  const pt = usePT()
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const rows = useRef<(HTMLButtonElement | null)[]>([])
  const entries = options.map(option => typeof option === 'string' ? { value: option, label: option, keywords: '' } : option)
  if (allowCustomValue && value && !entries.some(option => option.value === value)) entries.push({ value, label: value, keywords: '' })
  const filtered = entries.filter(option => searchable(`${option.label} ${option.value} ${option.keywords || ''}`).includes(searchable(query)))
  if (allowCustomValue && query.trim() && !entries.some(option => searchable(option.value) === searchable(query))) {
    filtered.push({ value: query.trim(), label: pt('Use {value}', { value: query.trim() }), keywords: '' })
  }
  const selected = entries.find(option => option.value === value)?.label || value
  const show = () => { setQuery(''); setActive(0); setOpen(true) }
  const choose = (selection: string) => { onChange(selection); setOpen(false); trigger.current?.focus() }

  useLayoutEffect(() => {
    if (!open) return
    const position = () => {
      if (!trigger.current || !menu.current || !list.current) return
      const bounds = trigger.current.getBoundingClientRect()
      const bottom = (window.visualViewport?.offsetTop || 0) + (window.visualViewport?.height || window.innerHeight)
      const below = bottom - bounds.bottom - 8
      const above = bounds.top - 8
      const up = below < 220 && above > below
      const height = Math.max(90, Math.min(320, up ? above : below))
      const width = Math.min(bounds.width, window.innerWidth - 16)
      menu.current.dataset.placement = up ? 'top' : 'bottom'
      Object.assign(menu.current.style, { width: `${width}px`, left: `${Math.max(8, Math.min(bounds.left, window.innerWidth - width - 8))}px`, top: `${up ? Math.max(8, bounds.top - height) : bounds.bottom + 4}px`, maxHeight: `${height}px`, visibility: 'visible' })
      list.current.style.maxHeight = `${Math.max(36, height - 76)}px`
    }
    const outside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false)
    }
    position()
    // Field's portaled subtree can commit after this layout effect. Position it
    // before focusing: hidden popups cannot receive keyboard focus.
    const focusFrame = requestAnimationFrame(() => { position(); search.current?.focus({ preventScroll: true }) })
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    window.visualViewport?.addEventListener('resize', position)
    document.addEventListener('pointerdown', outside)
    return () => {
      cancelAnimationFrame(focusFrame)
      window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true)
      window.visualViewport?.removeEventListener('resize', position); document.removeEventListener('pointerdown', outside)
    }
  }, [open])
  useEffect(() => { if (open) rows.current[active]?.scrollIntoView({ block: 'nearest' }) }, [open, active, query])

  return <Field label={label} required={required} hint={hint}>
    {(id, descriptionId) => <div className="relative min-w-0">
      <button ref={trigger} id={id} type="button" role="combobox" aria-describedby={descriptionId} aria-label={ariaLabel} aria-expanded={open} aria-haspopup="listbox" aria-controls={listId}
        className={cn(formControlClassName, 'relative h-12 pr-12 text-left', className)}
        onClick={() => open ? setOpen(false) : show()} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); show() } }}>
        <span className={cn('block truncate', !value && 'text-slate-500')}>{selected || pt(placeholder)}</span>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
      </button>
      <input aria-hidden="true" tabIndex={-1} className="sr-only" value={value} required={required} onChange={() => {}} onInvalid={event => { event.preventDefault(); show() }} />
      {open && createPortal(<div ref={menu} data-searchable-select-popup="" style={{ position: 'fixed', zIndex: 100 }} className="ui-popover overflow-hidden rounded-lg border border-slate-300 bg-white text-slate-900 shadow-lg">
        <div className="border-b border-slate-200 p-2">
          <input ref={search} value={query} maxLength={200} aria-label={pt('Search {field}', { field: pt(label || ariaLabel || 'options') })} aria-controls={listId} aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
            className={cn(formControlClassName, 'h-10')} placeholder={pt('Type to search…')}
            onChange={event => { setQuery(event.target.value); setActive(0) }}
            onKeyDown={event => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActive(index => filtered.length ? (index + (event.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length : 0) }
              else if (event.key === 'Enter') { event.preventDefault(); if (filtered[active]) choose(filtered[active].value) }
              else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus() }
              else if (event.key === 'Tab') setOpen(false)
            }} />
        </div>
        <div ref={list} id={listId} role="listbox" aria-label={pt(label || ariaLabel || 'options')} className="overflow-y-auto p-1">
          {filtered.length ? filtered.map((option, index) => <button ref={element => { rows.current[index] = element }} id={`${listId}-${index}`} key={option.value} type="button" role="option" tabIndex={-1} aria-selected={option.value === value}
            className={cn('flex min-h-10 w-full items-center justify-between gap-2 rounded px-3 py-2 text-left text-base [overflow-wrap:anywhere]', active === index ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50')}
            onPointerMove={() => setActive(index)} onClick={() => choose(option.value)}>
            <span>{pt(option.label)}</span>{option.value === value && <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
          </button>) : <p className="px-3 py-3 text-sm text-slate-500">{pt('No options found.')}</p>}
        </div>
      </div>, document.body)}
    </div>}
  </Field>
}
