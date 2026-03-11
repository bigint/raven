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
        <code className="text-xs font-mono text-text-dark-secondary">{item.entity_id}</code>
      ),
    },
    {
      key: 'limit',
      header: 'Limit',
      render: (item: BudgetConfig) => (
        <span className="font-medium">{formatCurrency(item.limit)}</span>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      render: (item: BudgetConfig) => <span className="text-sm capitalize">{item.period}</span>,
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (item: BudgetConfig) => {
        const pct = item.limit > 0 ? item.current_usage / item.limit : 0
        return (
          <div className="flex items-center gap-3 min-w-[120px]">
            <div className="flex-1 h-2 rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${
                  pct > 0.9 ? 'bg-error' : pct > 0.7 ? 'bg-warning' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(pct * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-text-dark-secondary">{formatPercent(pct)}</span>
          </div>
        )
      },
    },
    {
      key: 'current_usage',
      header: 'Current',
      render: (item: BudgetConfig) => (
        <span className="text-sm">{formatCurrency(item.current_usage)}</span>
      ),
    },
    {
      key: 'alert_threshold',
      header: 'Alert At',
      render: (item: BudgetConfig) => (
        <span className="text-sm text-text-dark-secondary">
          {formatPercent(item.alert_threshold)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-dark">Budgets</h1>
          <p className="text-sm text-text-dark-secondary mt-1">
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
