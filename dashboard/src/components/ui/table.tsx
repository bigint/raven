import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { HTMLAttributes, ReactNode, ThHTMLAttributes } from 'react'

export function Table({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableElement> & { children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement> & { children: ReactNode }) {
  return (
    <thead className={cn('border-b border-white/10', className)} {...props}>
      {children}
    </thead>
  )
}

export function TableBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement> & { children: ReactNode }) {
  return (
    <tbody className={cn('divide-y divide-white/10', className)} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { children: ReactNode }) {
  return (
    <tr className={cn('hover:bg-white/5 transition-colors', className)} {...props}>
      {children}
    </tr>
  )
}

interface SortableThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode
  sortKey?: string
  currentSort?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (key: string) => void
}

export function TableHead({
  className,
  children,
  sortKey,
  currentSort,
  sortOrder,
  onSort,
  ...props
}: SortableThProps) {
  const isSorted = sortKey && currentSort === sortKey
  const handleClick = () => {
    if (sortKey && onSort) onSort(sortKey)
  }

  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider',
        sortKey && 'cursor-pointer select-none hover:text-neutral-100',
        className,
      )}
      onClick={handleClick}
      {...props}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortKey && (
          <span className="inline-flex flex-col">
            <ChevronUp
              className={cn(
                'h-3 w-3 -mb-1',
                isSorted && sortOrder === 'asc' ? 'text-primary' : 'text-neutral-700',
              )}
            />
            <ChevronDown
              className={cn(
                'h-3 w-3',
                isSorted && sortOrder === 'desc' ? 'text-primary' : 'text-neutral-700',
              )}
            />
          </span>
        )}
      </div>
    </th>
  )
}

export function TableCell({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <td className={cn('px-4 py-3 text-sm', className)} {...props}>
      {children}
    </td>
  )
}
