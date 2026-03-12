'use client'

import { useSession } from '@/lib/auth-client'

const STAT_CARDS = [
  { label: 'Total Requests', value: '0', change: '+0%' },
  { label: 'Total Cost', value: '$0.00', change: '+0%' },
  { label: 'Active Keys', value: '0', change: '' },
  { label: 'Providers', value: '0', change: '' },
]

export default function OverviewPage() {
  const { data: session } = useSession()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back{session?.user?.name ? `, ${session.user.name}` : ''}. Here&apos;s what&apos;s
          happening.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border p-5">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-2xl font-bold">{stat.value}</span>
              {stat.change && (
                <span className="text-xs text-muted-foreground mb-1">{stat.change}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-border p-8 text-center">
        <p className="text-muted-foreground">
          No activity yet. Add a provider to get started.
        </p>
      </div>
    </div>
  )
}
