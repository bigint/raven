import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { HTMLAttributes, ReactNode, ThHTMLAttributes } from 'react'

export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('', className)} {...props}>
      {children}
    </thead>
  )
}

export function TableBody({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('', className)} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('h-9 border-b border-surface-hover hover:bg-surface', className)}
      {...props}
    >
      {children}
    </tr>
  )
}

interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortKey?: string
  currentSort?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (key: string) => void
  children: ReactNode
}

export function TableHead({ sortKey, currentSort, sortOrder, onSort, className, children, ...props }: TableHeadProps) {
  const isSorted = sortKey && currentSort === sortKey
  return (
    <th
      className={cn(
        'h-8 px-3 text-left text-[10px] font-medium uppercase tracking-[0.5px] text-text-muted',
        'border-b border-border',
        sortKey && 'cursor-pointer select-none',
        className,
      )}
      onClick={() => sortKey && onSort?.(sortKey)}
      {...props}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortKey && (
          <span className="inline-flex flex-col">
            <ChevronUp className={cn('h-2 w-2', isSorted && sortOrder === 'asc' ? 'text-text-primary' : 'text-text-muted')} />
            <ChevronDown className={cn('h-2 w-2 -mt-0.5', isSorted && sortOrder === 'desc' ? 'text-text-primary' : 'text-text-muted')} />
          </span>
        )}
      </div>
    </th>
  )
}

export function TableCell({ className, children, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-3 text-xs text-text-secondary', className)} {...props}>
      {children}
    </td>
  )
}
