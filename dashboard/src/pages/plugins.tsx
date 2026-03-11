import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent } from '@/components/ui/card'
import { Puzzle } from 'lucide-react'

export default function PluginsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-base font-semibold text-[#fafafa]">Plugins</h1>
      </div>

      <Card>
        <CardContent>
          <EmptyState
            title="Plugins coming soon"
            description="Install and manage plugins to extend your gateway with custom middleware, logging, and integrations."
            icon={<Puzzle className="h-8 w-8 text-[#525252]" />}
          />
        </CardContent>
      </Card>
    </div>
  )
}
