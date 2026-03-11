import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { apiClient } from '@/lib/api'
import type { Model } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

export default function ModelsPage() {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const { data: models, isLoading } = useQuery({
    queryKey: ['models'],
    queryFn: () => apiClient.listModels(),
  })

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortOrder('asc')
    }
  }

  const filteredModels = (models ?? []).filter(
    (m) =>
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.provider.toLowerCase().includes(search.toLowerCase()),
  )

  const columns = [
    {
      key: 'name',
      header: 'Model',
      sortable: true,
      render: (item: Model) => (
        <div>
          <p className="font-medium text-text-dark">{item.name}</p>
          <p className="text-xs text-text-dark-secondary">{item.id}</p>
        </div>
      ),
    },
    {
      key: 'provider',
      header: 'Provider',
      sortable: true,
      render: (item: Model) => <Badge variant="info">{item.provider}</Badge>,
    },
    {
      key: 'input_price_per_token',
      header: 'Input Price',
      sortable: true,
      render: (item: Model) => (
        <span className="text-sm">{formatCurrency(item.input_price_per_token * 1_000_000)}/M</span>
      ),
    },
    {
      key: 'output_price_per_token',
      header: 'Output Price',
      sortable: true,
      render: (item: Model) => (
        <span className="text-sm">{formatCurrency(item.output_price_per_token * 1_000_000)}/M</span>
      ),
    },
    {
      key: 'context_window',
      header: 'Context',
      sortable: true,
      render: (item: Model) => (
        <span className="text-sm">{(item.context_window / 1000).toFixed(0)}K</span>
      ),
    },
    {
      key: 'features',
      header: 'Features',
      render: (item: Model) => (
        <div className="flex gap-1">
          {item.supports_streaming && <Badge variant="default">Stream</Badge>}
          {item.supports_vision && <Badge variant="default">Vision</Badge>}
          {item.supports_function_calling && <Badge variant="default">Tools</Badge>}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-dark">Models</h1>
        <p className="text-sm text-text-dark-secondary mt-1">Available models and pricing</p>
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredModels}
            total={filteredModels.length}
            onSearch={setSearch}
            onSort={handleSort}
            sortBy={sortBy}
            sortOrder={sortOrder}
            isLoading={isLoading}
            searchPlaceholder="Search models..."
            emptyTitle="No models available"
            emptyDescription="Models will appear once providers are configured."
            getRowKey={(item) => item.id}
          />
        </CardContent>
      </Card>
    </div>
  )
}
