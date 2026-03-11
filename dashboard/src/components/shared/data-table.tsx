import { EmptyState } from '@/components/shared/empty-state'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  total?: number
  page?: number
  perPage?: number
  onPageChange?: (page: number) => void
  onSearch?: (query: string) => void
  onSort?: (key: string) => void
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  isLoading?: boolean
  searchPlaceholder?: string
  emptyTitle?: string
  emptyDescription?: string
  actions?: ReactNode
  onRowClick?: (row: T) => void
  getRowKey: (row: T) => string
  expandedRow?: string | null
  renderExpandedRow?: (row: T) => ReactNode
}

export function DataTable<T>({
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
}: DataTableProps<T>) {
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
              <Input
                placeholder={searchPlaceholder}
                onChange={(e) => onSearch(e.target.value)}
              />
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
                          {col.render ? col.render(row) : (row as any)[col.key]}
                        </TableCell>
                      ))}
                    </TableRow>
                    {isExpanded && renderExpandedRow && (
                      <tr key={`${key}-expanded`}>
                        <td colSpan={columns.length} className="bg-white/[0.01] border-b border-white/[0.06] p-0">
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
              <span className="text-[11px] text-[#525252]">
                {start}–{end} of {totalItems} results
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                  className="h-6 w-6 rounded-[5px] text-[11px] text-[#a3a3a3] hover:bg-white/[0.05] disabled:opacity-40"
                >
                  ‹
                </button>
                {pageNumbers.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPageChange(p)}
                    className={cn(
                      'h-6 w-6 rounded-[5px] text-[11px]',
                      p === page ? 'bg-white/[0.08] text-[#fafafa]' : 'text-[#525252] hover:bg-white/[0.05]',
                    )}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                  className="h-6 w-6 rounded-[5px] text-[11px] text-[#a3a3a3] hover:bg-white/[0.05] disabled:opacity-40"
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
