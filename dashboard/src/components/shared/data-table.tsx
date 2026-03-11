import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SkeletonTable } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { type ReactNode, useState } from 'react'

interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (item: T) => ReactNode
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
  onRowClick?: (item: T) => void
  getRowKey: (item: T) => string
}

export function DataTable<T>({
  columns,
  data,
  total = 0,
  page = 1,
  perPage = 20,
  onPageChange,
  onSearch,
  onSort,
  sortBy,
  sortOrder,
  isLoading,
  searchPlaceholder = 'Search...',
  emptyTitle = 'No results found',
  emptyDescription,
  actions,
  onRowClick,
  getRowKey,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const totalPages = Math.ceil(total / perPage)

  const handleSearch = (value: string) => {
    setSearch(value)
    onSearch?.(value)
  }

  const handleSort = (key: string) => {
    onSort?.(key)
  }

  if (isLoading) {
    return <SkeletonTable />
  }

  const startPage = Math.max(1, page - 2)
  const endPage = Math.min(totalPages, startPage + 4)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        {onSearch && (
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
            <Input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>
        )}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {data.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    sortKey={col.sortable ? col.key : undefined}
                    currentSort={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    className={col.className}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow
                  key={getRowKey(item)}
                  className={cn(onRowClick && 'cursor-pointer')}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render
                        ? col.render(item)
                        : String((item as Record<string, unknown>)[col.key] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && onPageChange && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-zinc-600">
                Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, total)} of {total}{' '}
                results
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onPageChange(page - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(
                  (p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => onPageChange(p)}
                      className={cn(
                        'h-8 w-8 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer',
                        p === page
                          ? 'bg-white/[8%] text-white'
                          : 'text-zinc-500 hover:bg-white/[4%] hover:text-zinc-300',
                      )}
                    >
                      {p}
                    </button>
                  ),
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
