import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { apiClient } from '@/lib/api'
import type { BudgetConfig } from '@/lib/types'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { Wallet } from 'lucide-react'

export default function BudgetsPage() {
  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => apiClient.listBudgets(),
    retry: false,
    placeholderData: [],
  })

  const columns = [
    {
      key: 'entity_type',
      header: 'Type',
      render: (item: BudgetConfig) => (
        <Badge
          variant={
            item.entity_type === 'org'
              ? 'info'
              : item.entity_type === 'team'
                ? 'default'
                : 'warning'
          }
        >
          {item.entity_type}
        </Badge>
      ),
    },
    {
      key: 'entity_id',
      header: 'Entity',
      render: (item: BudgetConfig) => (
        <code className="text-xs font-mono text-zinc-500">{item.entity_id}</code>
      ),
    },
    {
      key: 'limit',
      header: 'Limit',
      render: (item: BudgetConfig) => (
        <span className="font-medium text-zinc-200">{formatCurrency(item.limit)}</span>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      render: (item: BudgetConfig) => (
        <span className="text-sm capitalize text-zinc-300">{item.period}</span>
      ),
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (item: BudgetConfig) => {
        const pct = item.limit > 0 ? item.current_usage / item.limit : 0
        return (
          <div className="flex items-center gap-3 min-w-[120px]">
            <div className="flex-1 h-1.5 rounded-full bg-white/[6%]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pct > 0.9 ? 'bg-red-400' : pct > 0.7 ? 'bg-amber-400' : 'bg-indigo-400'
                }`}
                style={{ width: `${Math.min(pct * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-zinc-500 tabular-nums">{formatPercent(pct)}</span>
          </div>
        )
      },
    },
    {
      key: 'current_usage',
      header: 'Current',
      render: (item: BudgetConfig) => (
        <span className="text-sm text-zinc-300">{formatCurrency(item.current_usage)}</span>
      ),
    },
    {
      key: 'alert_threshold',
      header: 'Alert At',
      render: (item: BudgetConfig) => (
        <span className="text-sm text-zinc-500">{formatPercent(item.alert_threshold)}</span>
      ),
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Budgets</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Configure spending limits per organization, team, or key
          </p>
        </div>
        <Button>
          <Wallet className="h-4 w-4" />
          Create Budget
        </Button>
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={budgets ?? []}
            total={budgets?.length ?? 0}
            isLoading={isLoading}
            emptyTitle="No budgets configured"
            emptyDescription="Set up spending limits to control costs across your teams and keys."
            getRowKey={(item) => item.id}
          />
        </CardContent>
      </Card>
    </div>
  )
}
