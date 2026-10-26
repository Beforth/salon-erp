import { Children, Fragment, isValidElement } from 'react'
import { cn } from '@/lib/utils'
import { SearchableSelect } from '@/components/ui/searchable-select'

function nodeText(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (isValidElement(node)) return nodeText(node.props.children)
  return String(node)
}

function collectOptions(children, out = []) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    if (child.type === Fragment || child.type === 'optgroup') {
      collectOptions(child.props.children, out)
    } else if (child.type === 'option') {
      const label = nodeText(child.props.children)
      out.push({
        value: child.props.value !== undefined ? String(child.props.value) : label,
        label,
        disabled: child.props.disabled,
      })
    }
  })
  return out
}

// Tailwind size/typography classes that belong on the trigger rather than the wrapper.
const TRIGGER_CLASS = /^(h-|text-|px-|py-|p-|min-h-|font-)/

/**
 * Drop-in replacement for a native <select>: same <option> children and
 * onChange(e) with e.target.value, but searchable and scroll-safe in dialogs.
 */
export function SelectField({
  children,
  value,
  onChange,
  disabled,
  required,
  className,
  title,
  id,
  name,
}) {
  const options = collectOptions(children).filter((o) => !o.disabled)
  const current = value === null || value === undefined ? '' : String(value)
  const hasEmptyOption = options.some((o) => o.value === '')
  const placeholder = options.find((o) => o.value === '')?.label || 'Select...'

  const classes = (className || '').split(/\s+/).filter(Boolean)
  const triggerClassName = classes.filter((c) => TRIGGER_CLASS.test(c)).join(' ')
  const wrapperClassName = classes.filter((c) => !TRIGGER_CLASS.test(c) && !/^(border|rounded|bg-)/.test(c)).join(' ')

  return (
    <div className={cn('relative', wrapperClassName || 'w-full')} title={title}>
      <SearchableSelect
        // The empty option acts as the placeholder / "clear" entry.
        options={options.filter((o) => o.value !== '')}
        value={current}
        onChange={(v) => onChange?.({ target: { value: v, name, id }, currentTarget: { value: v, name, id } })}
        placeholder={hasEmptyOption ? placeholder : 'Select...'}
        disabled={disabled}
        triggerClassName={triggerClassName}
      />
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={current}
          onChange={() => {}}
          className="absolute inset-x-0 bottom-0 h-px w-full opacity-0 pointer-events-none"
        />
      )}
    </div>
  )
}
