import { EmptyState } from '@/components/shared/empty-state'
import { Puzzle } from 'lucide-react'

export default function PluginsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[13px] font-semibold text-[#fafafa]">Plugins</h1>
      </div>

      <div className="flex items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] py-16">
        <EmptyState
          title="Coming Soon"
          description="Install and manage plugins to extend your gateway"
          icon={<Puzzle className="h-5 w-5" />}
        />
      </div>
    </div>
  )
}
