import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Search, X, ChevronDown } from 'lucide-react'

const DROPDOWN_MAX_HEIGHT = 220
const DROPDOWN_GAP = 4

/**
 * Searchable select dropdown. Menu renders in a portal so it is not clipped by
 * overflow containers (tables, cards, etc.).
 */
export function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  className,
  compact = false,
  triggerClassName,
  formatOption,
  portalTarget,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [menuStyle, setMenuStyle] = useState(null)
  const containerRef = useRef(null)
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)
  const targetRef = useRef(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const [highlight, setHighlight] = useState(0)

  const selectedOption = options.find((o) => o.value === value)

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const updateMenuPosition = useCallback(() => {
    const el = containerRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const upward = spaceBelow < DROPDOWN_MAX_HEIGHT + 48 && spaceAbove > spaceBelow

    const width = Math.max(rect.width, compact ? 220 : 240)

    // Inside a Radix Dialog the menu must live in the dialog's DOM: the dialog
    // traps focus (search box could not be typed in) and locks wheel scrolling
    // outside itself (list could not be scrolled). The dialog is a transformed
    // element, so `fixed` coordinates are relative to it, not the viewport.
    const target =
      portalTarget !== undefined
        ? portalTarget
        : el.closest('[role="dialog"]') || document.body
    targetRef.current = target

    if (target === null) {
      setMenuStyle({
        position: 'absolute',
        left: 0,
        width,
        minWidth: width,
        zIndex: 9999,
        pointerEvents: 'auto',
        ...(upward
          ? { bottom: `calc(100% + ${DROPDOWN_GAP}px)` }
          : { top: `calc(100% + ${DROPDOWN_GAP}px)` }),
      })
      return
    }

    let originLeft = 0
    let originTop = 0
    let originBottom = window.innerHeight
    if (target !== document.body) {
      const tr = target.getBoundingClientRect()
      originLeft = tr.left + target.clientLeft
      originTop = tr.top + target.clientTop
      originBottom = tr.top + target.clientTop + target.clientHeight
    }
    // pointerEvents: auto - Radix Dialog sets pointer-events:none on body.
    setMenuStyle({
      position: 'fixed',
      left: rect.left - originLeft,
      width,
      minWidth: width,
      zIndex: 9999,
      pointerEvents: 'auto',
      ...(upward
        ? { bottom: originBottom - rect.top + DROPDOWN_GAP }
        : { top: rect.bottom - originTop + DROPDOWN_GAP }),
    })
  }, [compact, portalTarget])

  useLayoutEffect(() => {
    if (!open) return
    updateMenuPosition()
  }, [open, updateMenuPosition])

  useEffect(() => {
    if (!open) return undefined

    const onScrollOrResize = () => updateMenuPosition()
    window.addEventListener('resize', onScrollOrResize)
    window.addEventListener('scroll', onScrollOrResize, true)

    return () => {
      window.removeEventListener('resize', onScrollOrResize)
      window.removeEventListener('scroll', onScrollOrResize, true)
    }
  }, [open, updateMenuPosition])

  useEffect(() => {
    const handler = (e) => {
      if (
        containerRef.current?.contains(e.target) ||
        dropdownRef.current?.contains(e.target)
      ) {
        return
      }
      setOpen(false)
      setSearch('')
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Keep the highlighted row valid and visible as the filter / arrows change
  useEffect(() => {
    setHighlight(0)
  }, [search, open])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector('[data-highlighted="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [highlight, open])

  const handleSelect = (val) => {
    onChange(val)
    setOpen(false)
    setSearch('')
    // Return focus to the field so Tab continues to the next one
    setTimeout(() => triggerRef.current?.focus(), 0)
  }

  const openMenu = (initialSearch = '') => {
    if (disabled) return
    setSearch(initialSearch)
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange('')
    setSearch('')
  }

  const handleTriggerClick = () => {
    if (disabled) return
    setOpen((prev) => {
      const next = !prev
      if (next) {
        setTimeout(() => inputRef.current?.focus(), 0)
      } else {
        setSearch('')
      }
      return next
    })
  }

  const dropdown = open && menuStyle && (
    <div
      ref={dropdownRef}
      data-searchable-select-dropdown=""
      style={menuStyle}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      className="rounded-md border border-input bg-background shadow-lg pointer-events-auto"
    >
      <div className={cn('flex items-center border-b', compact ? 'px-2 py-1.5' : 'px-3 py-2')}>
        <Search className={cn(compact ? 'h-3 w-3' : 'h-4 w-4', 'text-muted-foreground mr-2 shrink-0')} />
        <input
          ref={inputRef}
          type="text"
          className={cn(
            'flex-1 bg-transparent outline-none placeholder:text-muted-foreground',
            compact ? 'text-xs' : 'text-sm'
          )}
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault(); e.stopPropagation()
              setOpen(false); setSearch('')
              setTimeout(() => triggerRef.current?.focus(), 0)
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              setHighlight((h) => Math.min(h + 1, filtered.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setHighlight((h) => Math.max(h - 1, 0))
            } else if (e.key === 'Enter' || e.key === 'Tab') {
              // Enter / Tab pick the highlighted row (Tab then moves on naturally)
              if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation() }
              if (filtered[highlight]) handleSelect(filtered[highlight].value)
              else if (e.key === 'Tab') { setOpen(false); setSearch('') }
            }
          }}
        />
      </div>
      <div
        ref={listRef}
        className="overflow-y-auto py-1"
        style={{ maxHeight: DROPDOWN_MAX_HEIGHT }}
      >
        {filtered.length === 0 ? (
          <div
            className={cn(
              'text-muted-foreground',
              compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'
            )}
          >
            No results found
          </div>
        ) : (
          filtered.map((option, idx) => (
            <button
              key={option.value}
              type="button"
              tabIndex={-1}
              data-highlighted={idx === highlight}
              onMouseEnter={() => setHighlight(idx)}
              className={cn(
                'w-full text-left hover:bg-accent hover:text-accent-foreground cursor-pointer',
                compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm',
                idx === highlight && 'bg-accent text-accent-foreground',
                option.value === value && 'font-medium'
              )}
              onMouseDown={(e) => {
                // Select on mousedown so Radix Dialog focus/dismiss logic
                // cannot swallow the later click when the menu is portaled.
                e.preventDefault()
                handleSelect(option.value)
              }}
            >
              {formatOption ? formatOption(option) : option.label}
            </button>
          ))
        )}
      </div>
    </div>
  )

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        onKeyDown={(e) => {
          if (disabled || open) return
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            openMenu()
          } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== ' ') {
            // Start typing to search straight away
            e.preventDefault()
            openMenu(e.key)
          }
        }}
        disabled={disabled}
        className={cn(
          compact
            ? 'flex h-6 w-full items-center justify-between rounded border border-input bg-background px-1 py-0 text-[11px] ring-offset-background'
            : 'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
          'outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/15',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !selectedOption && 'text-muted-foreground',
          triggerClassName
        )}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <X
              className={cn(
                compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5',
                'text-muted-foreground hover:text-foreground cursor-pointer'
              )}
              onClick={handleClear}
            />
          )}
          <ChevronDown className={cn(compact ? 'h-3 w-3' : 'h-4 w-4', 'text-muted-foreground')} />
        </div>
      </button>

      {typeof document !== 'undefined' && dropdown && targetRef.current
        ? createPortal(dropdown, targetRef.current)
        : dropdown}
    </div>
  )
}
