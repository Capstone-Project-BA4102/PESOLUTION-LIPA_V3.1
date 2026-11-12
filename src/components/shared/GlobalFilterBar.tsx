import { useState, useRef, useEffect } from 'react'
import { Filter, X } from 'lucide-react'
import { Card, Button, Select, SearchInput } from '@/components/ui'
import { usePT } from '@/lib/portalCopy'

export interface FilterOption {
  id: string
  label: string
  placeholder: string
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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasActiveFilters = filterOptions.some((opt) => activeFilters[opt.id] && activeFilters[opt.id] !== opt.options[0])

  return (
    <Card className="flex flex-wrap items-center gap-3 p-4 shrink-0 relative">
      <SearchInput
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label={pt('Search records')}
        className="flex-1 min-w-[240px]"
      />
      
      <div className="flex gap-2 relative" ref={dropdownRef}>
        <Button 
          icon={<Filter className="h-5 w-5" />} 
          onClick={() => setIsOpen(!isOpen)}
          variant={hasActiveFilters ? 'primary' : 'neutral'}
        >
          {pt('Filters')} {hasActiveFilters && pt('(Active)')}
        </Button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 z-50 p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">{pt('Advanced Filters')}</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              {filterOptions.map((opt) => (
                <div key={opt.id} className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {pt(opt.label)}
                  </span>
                  <Select
                    options={opt.options}
                    value={activeFilters[opt.id] || ''}
                    onChange={(e) => onFilterChange(opt.id, e.target.value)}
                    className="w-full h-10"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <Button variant="neutral" onClick={onClear}>
          Clear
        </Button>
      </div>
    </Card>
  )
}
