import { EmptyState } from '@/components/shared/empty-state'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface Column<T> {
  readonly key: string
  readonly header: string
  readonly sortable?: boolean
  readonly render?: (row: T) => ReactNode
  readonly className?: string
}

interface DataTableProps<T> {
  readonly columns: Column<T>[]
  readonly data: T[]
  readonly total?: number
  readonly page?: number
  readonly perPage?: number
  readonly onPageChange?: (page: number) => void
  readonly onSearch?: (query: string) => void
  readonly onSort?: (key: string) => void
  readonly sortBy?: string
  readonly sortOrder?: 'asc' | 'desc'
  readonly isLoading?: boolean
  readonly searchPlaceholder?: string
  readonly emptyTitle?: string
  readonly emptyDescription?: string
  readonly actions?: ReactNode
  readonly onRowClick?: (row: T) => void
  readonly getRowKey: (row: T) => string
  readonly expandedRow?: string | null
  readonly renderExpandedRow?: (row: T) => ReactNode
}

export const DataTable = <T,>({
  columns,
  data,
  total,
  page = 1,
  perPage = 20,
  onPageChange,
  onSearch,
  onSort,
  sortBy,
  sortOrder,
  searchPlaceholder = 'Search...',
  emptyTitle = 'No results',
  emptyDescription,
  actions,
  onRowClick,
  getRowKey,
  expandedRow,
  renderExpandedRow,
}: DataTableProps<T>) => {
  const totalItems = total ?? data.length
  const totalPages = Math.ceil(totalItems / perPage)
  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, totalItems)

  const pageNumbers = []
  for (let i = 1; i <= Math.min(totalPages, 5); i++) {
    pageNumbers.push(i)
  }

  return (
    <div>
      {(onSearch || actions) && (
        <div className="flex items-center gap-3 mb-3">
          {onSearch && (
            <div className="flex-1">
              <Input placeholder={searchPlaceholder} onChange={(e) => onSearch(e.target.value)} />
            </div>
          )}
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}

      {data.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <tr>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    sortKey={col.sortable ? col.key : undefined}
                    currentSort={sortBy}
                    sortOrder={sortOrder}
                    onSort={onSort}
                    className={col.className}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </tr>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const key = getRowKey(row)
                const isExpanded = expandedRow === key
                return (
                  <>
                    <TableRow
                      key={key}
                      onClick={() => onRowClick?.(row)}
                      className={cn(onRowClick && 'cursor-pointer')}
                    >
                      {columns.map((col) => (
                        <TableCell key={col.key} className={col.className}>
                          {col.render
                            ? col.render(row)
                            : String((row as Record<string, unknown>)[col.key] ?? '')}
                        </TableCell>
                      ))}
                    </TableRow>
                    {isExpanded && renderExpandedRow && (
                      <tr key={`${key}-expanded`}>
                        <td
                          colSpan={columns.length}
                          className="bg-surface border-b border-border p-0"
                        >
                          {renderExpandedRow(row)}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </TableBody>
          </Table>

          {onPageChange && totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-text-tertiary">
                {start}–{end} of {totalItems} results
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                  className="size-6 rounded-[5px] text-[11px] text-text-secondary hover:bg-surface-hover disabled:opacity-40"
                >
                  ‹
                </button>
                {pageNumbers.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPageChange(p)}
                    className={cn(
                      'size-6 rounded-[5px] text-[11px]',
                      p === page
                        ? 'bg-surface-active text-text-primary'
                        : 'text-text-tertiary hover:bg-surface-hover',
                    )}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                  className="size-6 rounded-[5px] text-[11px] text-text-secondary hover:bg-surface-hover disabled:opacity-40"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
