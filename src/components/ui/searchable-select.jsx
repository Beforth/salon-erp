import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Search, X, ChevronDown } from 'lucide-react'

/**
 * Searchable select dropdown.
 *
 * @param {Object} props
 * @param {Array<{value: string, label: string}>} props.options
 * @param {string} props.value - Currently selected value
 * @param {(value: string) => void} props.onChange
 * @param {string} [props.placeholder]
 * @param {boolean} [props.disabled]
 * @param {string} [props.className]
 */
export function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  className,
  compact = false,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const selectedOption = options.find((o) => o.value === value)

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (val) => {
    onChange(val)
    setOpen(false)
    setSearch('')
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange('')
    setSearch('')
  }

  const handleTriggerClick = () => {
    if (disabled) return
    setOpen(!open)
    if (!open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleTriggerClick}
        disabled={disabled}
        className={cn(
          compact
            ? 'flex h-6 w-full items-center justify-between rounded border border-input bg-background px-1 py-0 text-[11px] ring-offset-background'
            : 'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !selectedOption && 'text-muted-foreground'
        )}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <X className={cn(compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5', 'text-muted-foreground hover:text-foreground cursor-pointer')} onClick={handleClear} />
          )}
          <ChevronDown className={cn(compact ? 'h-3 w-3' : 'h-4 w-4', 'text-muted-foreground')} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className={cn('absolute z-50 mt-1 rounded-md border border-input bg-background shadow-lg', compact ? 'min-w-[180px]' : 'w-full')}>
          {/* Search input */}
          <div className={cn('flex items-center border-b', compact ? 'px-2 py-1.5' : 'px-3 py-2')}>
            <Search className={cn(compact ? 'h-3 w-3' : 'h-4 w-4', 'text-muted-foreground mr-2 shrink-0')} />
            <input
              ref={inputRef}
              type="text"
              className={cn('flex-1 bg-transparent outline-none placeholder:text-muted-foreground', compact ? 'text-xs' : 'text-sm')}
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* Options list */}
          <div className="max-h-[200px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className={cn('text-muted-foreground', compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm')}>No results found</div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'w-full text-left hover:bg-accent hover:text-accent-foreground cursor-pointer',
                    compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm',
                    option.value === value && 'bg-accent text-accent-foreground font-medium'
                  )}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
