import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Syncs filter state to URL search params.
 *
 * @param {Object} filterConfig - Map of param names to default values.
 *   e.g. { mode: 'range', startDate: '2026-01-01', branch: '' }
 *
 * @returns {[Object, Function]} - [currentFilters, setFilters]
 *   - currentFilters: object with current values (from URL or defaults)
 *   - setFilters: function accepting partial updates, e.g. setFilters({ branch: '123' })
 */
export function useFilterParams(filterConfig) {
  const [searchParams, setSearchParams] = useSearchParams()

  // Build current values from URL params, falling back to defaults
  const filters = {}
  for (const [key, defaultValue] of Object.entries(filterConfig)) {
    const urlValue = searchParams.get(key)
    filters[key] = urlValue !== null ? urlValue : defaultValue
  }

  const setFilters = useCallback(
    (updates) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(updates)) {
          const defaultValue = filterConfig[key]
          // Remove param if it matches the default (keep URL clean)
          if (value === defaultValue || value === '' || value === null || value === undefined) {
            next.delete(key)
          } else {
            next.set(key, value)
          }
        }
        return next
      }, { replace: true })
    },
    [setSearchParams, filterConfig]
  )

  return [filters, setFilters]
}

/**
 * Builds a returnTo URL string from the current location (path + search params).
 * Pass this as a query param when navigating away so the target page can navigate back.
 */
export function buildReturnTo(location) {
  return location.pathname + location.search
}
