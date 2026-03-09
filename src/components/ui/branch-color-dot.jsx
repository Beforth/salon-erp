import { cn } from '@/lib/utils'

export function BranchColorDot({ color, className }) {
  if (!color) return null
  return (
    <span
      className={cn('inline-block w-2.5 h-2.5 rounded-full flex-shrink-0', className)}
      style={{ backgroundColor: color }}
    />
  )
}
