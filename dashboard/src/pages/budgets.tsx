import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { apiClient } from '@/lib/api'
import type { BudgetConfig } from '@/lib/types'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'

export default function BudgetsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [entityType, setEntityType] = useState('')
  const [entityId, setEntityId] = useState('')
  const [limit, setLimit] = useState('')
  const [period, setPeriod] = useState('')
  const [alertThreshold, setAlertThreshold] = useState('80')
  const queryClient = useQueryClient()

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => apiClient.listBudgets(),
    retry: false,
    placeholderData: [],
  })

  const createBudget = useMutation({
    mutationFn: () =>
      apiClient.createBudget({
        entity_type: entityType as 'org' | 'team' | 'key',
        entity_id: entityId,
        limit: Number(limit),
        period: period as 'daily' | 'weekly' | 'monthly',
        alert_threshold: Number(alertThreshold) / 100,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      setCreateOpen(false)
      setEntityType('')
      setEntityId('')
      setLimit('')
      setPeriod('')
      setAlertThreshold('80')
    },
  })

  const columns = [
    {
      key: 'entity_type',
      header: 'Type',
      render: (item: BudgetConfig) => <Badge variant="default">{item.entity_type}</Badge>,
    },
    {
      key: 'entity_id',
      header: 'Entity',
      render: (item: BudgetConfig) => (
        <span className="font-mono text-[11px] text-[#525252]">{item.entity_id}</span>
      ),
    },
    {
      key: 'limit',
      header: 'Limit',
      render: (item: BudgetConfig) => (
        <span className="font-mono text-xs font-medium text-[#fafafa]">
          {formatCurrency(item.limit)}
        </span>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      render: (item: BudgetConfig) => (
        <span className="text-xs text-[#a3a3a3] capitalize">{item.period}</span>
      ),
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (item: BudgetConfig) => {
        const pct = item.limit > 0 ? item.current_usage / item.limit : 0
        const barColor =
          pct > 0.9
            ? 'bg-[rgba(239,68,68,0.35)]'
            : pct > 0.7
              ? 'bg-[rgba(245,158,11,0.35)]'
              : 'bg-white/[0.20]'
        return (
          <div className="flex items-center gap-2">
            <div className="w-20 h-1 rounded-sm bg-white/[0.04]">
              <div
                className={`h-full rounded-sm ${barColor}`}
                style={{ width: `${Math.min(pct * 100, 100)}%` }}
              />
            </div>
            <span className="font-mono text-xs font-medium text-[#fafafa]">
              {formatPercent(pct)}
            </span>
          </div>
        )
      },
    },
    {
      key: 'current_usage',
      header: 'Spent',
      render: (item: BudgetConfig) => (
        <span className="font-mono text-xs font-medium text-[#fafafa]">
          {formatCurrency(item.current_usage)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[13px] font-semibold text-[#fafafa]">Budgets</h1>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Create Budget
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={budgets ?? []}
        total={budgets?.length ?? 0}
        isLoading={isLoading}
        emptyTitle="No budgets configured"
        emptyDescription="Set up spending limits to control costs across your teams and keys."
        getRowKey={(item) => item.id}
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <DialogHeader>
          <DialogTitle>Create Budget</DialogTitle>
          <DialogDescription>Set a spending limit for an entity.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select
            label="Entity Type"
            options={[
              { value: 'org', label: 'Organization' },
              { value: 'team', label: 'Team' },
              { value: 'key', label: 'Key' },
            ]}
            placeholder="Select type..."
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          />
          <Input
            label="Entity ID"
            placeholder="e.g., acme-corp"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            className="font-mono"
          />
          <Input
            label="Limit ($)"
            placeholder="e.g., 5000"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
          <Select
            label="Period"
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
            placeholder="Select period..."
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
          <Input
            label="Alert Threshold (%)"
            placeholder="80"
            value={alertThreshold}
            onChange={(e) => setAlertThreshold(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => createBudget.mutate()}
            disabled={createBudget.isPending}
          >
            {createBudget.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
