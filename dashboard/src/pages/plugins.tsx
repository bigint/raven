import { EmptyState } from '@/components/shared/empty-state'
import { Puzzle } from 'lucide-react'

const PluginsPage = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[13px] font-semibold text-text-primary">Plugins</h1>
      </div>

      <div className="flex items-center justify-center rounded-lg border border-border bg-surface py-16">
        <EmptyState
          title="Coming Soon"
          description="Install and manage plugins to extend your gateway"
          icon={<Puzzle className="size-5" />}
        />
      </div>
    </div>
  )
}

export default PluginsPage
