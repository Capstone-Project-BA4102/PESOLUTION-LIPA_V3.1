import { useState, useRef, useEffect } from 'react'
import { Filter, X } from 'lucide-react'
import { Button, Select, SearchInput } from '@/components/ui'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { usePT } from '@/lib/portalCopy'

export interface FilterOption {
  id: string
  label: string
  placeholder: string
  searchable?: boolean
  options: Array<string | { value: string; label: string }>
}

interface GlobalFilterBarProps {
  searchPlaceholder?: string
  searchValue: string
  onSearchChange: (val: string) => void
  filterOptions: FilterOption[]
  activeFilters: Record<string, string>
  onFilterChange: (id: string, val: string) => void
  onClear: () => void
}

export function GlobalFilterBar({
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  filterOptions,
  activeFilters,
  onFilterChange,
  onClear,
}: GlobalFilterBarProps) {
  const pt = usePT()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && !(event.target instanceof Element && event.target.closest('[data-searchable-select-popup]'))) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasActiveFilters = filterOptions.some((opt) => activeFilters[opt.id] && activeFilters[opt.id] !== opt.options[0])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label={pt('Search records')}
        className="min-w-[220px] flex-1"
      />

      <div className="ml-auto flex items-center gap-1.5" ref={dropdownRef}>
        <Button
          size="sm"
          icon={<Filter className="h-4 w-4" />}
          onClick={() => setIsOpen(!isOpen)}
          variant={hasActiveFilters ? 'primary' : 'neutral'}
          aria-expanded={isOpen}
        >
          {pt('Filters')}{hasActiveFilters ? ' · ' + pt('Active') : ''}
        </Button>

        {isOpen && (
          <div className="ui-popover absolute top-full right-0 z-50 mt-2 flex w-72 flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-slate-800">{pt('Advanced Filters')}</h3>
              <button type="button" aria-label={pt('Close')} onClick={() => setIsOpen(false)} className="rounded p-0.5 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {filterOptions.map((opt) => (
                <div key={opt.id} className="flex flex-col gap-1">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                    {pt(opt.label)}
                  </span>
                  {opt.searchable ? <SearchableSelect ariaLabel={opt.label} options={opt.options} value={activeFilters[opt.id] || ''} onChange={value => onFilterChange(opt.id, value)} /> : <Select
                    options={opt.options}
                    value={activeFilters[opt.id] || ''}
                    onChange={(e) => onFilterChange(opt.id, e.target.value)}
                    className="w-full"
                  />}
                </div>
              ))}
            </div>
          </div>
        )}

        <Button size="sm" variant="ghost" onClick={onClear}>
          {pt('Clear')}
        </Button>
      </div>
    </div>
  )
}
