import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent } from '@/components/ui/card'
import { Puzzle } from 'lucide-react'

export default function PluginsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Plugins</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Manage gateway plugins and extensions
        </p>
      </div>

      <Card>
        <CardContent>
          <EmptyState
            title="Plugins coming soon"
            description="Install and manage plugins to extend your gateway with custom middleware, logging, and integrations."
            icon={<Puzzle className="h-8 w-8 text-neutral-500" />}
          />
        </CardContent>
      </Card>
    </div>
  )
}
