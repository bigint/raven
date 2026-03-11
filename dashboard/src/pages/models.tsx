import { DataTable } from '@/components/shared/data-table'
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
        <span className="text-xs font-medium text-[#fafafa]">{item.name}</span>
      ),
    },
    {
      key: 'provider',
      header: 'Provider',
      sortable: true,
      render: (item: Model) => (
        <span className="text-xs text-[#a3a3a3]">{item.provider}</span>
      ),
    },
    {
      key: 'input_price_per_token',
      header: 'Input $/M',
      sortable: true,
      render: (item: Model) => (
        <span className="font-mono text-xs font-medium text-[#fafafa] text-right">
          {formatCurrency(item.input_price_per_token * 1_000_000)}/M
        </span>
      ),
    },
    {
      key: 'output_price_per_token',
      header: 'Output $/M',
      sortable: true,
      render: (item: Model) => (
        <span className="font-mono text-xs font-medium text-[#fafafa] text-right">
          {formatCurrency(item.output_price_per_token * 1_000_000)}/M
        </span>
      ),
    },
    {
      key: 'context_window',
      header: 'Context',
      sortable: true,
      render: (item: Model) => (
        <span className="font-mono text-xs font-medium text-[#fafafa]">
          {(item.context_window / 1000).toFixed(0)}K
        </span>
      ),
    },
    {
      key: 'features',
      header: 'Features',
      render: (item: Model) => (
        <div className="flex gap-1.5 font-mono text-xs">
          <span className={item.supports_streaming ? 'text-[#fafafa]' : 'text-[#333]'}>S</span>
          <span className={item.supports_vision ? 'text-[#fafafa]' : 'text-[#333]'}>V</span>
          <span className={item.supports_function_calling ? 'text-[#fafafa]' : 'text-[#333]'}>T</span>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[13px] font-semibold text-[#fafafa]">Models</h1>
      </div>

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
    </div>
  )
}
