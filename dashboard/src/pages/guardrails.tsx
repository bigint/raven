import { EmptyState } from '@/components/shared/empty-state'
import { Shield } from 'lucide-react'

const GuardrailsPage = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[13px] font-semibold text-text-primary">Guardrails</h1>
      </div>

      <div className="flex items-center justify-center rounded-lg border border-border bg-surface py-16">
        <EmptyState
          title="Coming Soon"
          description="Content filtering and safety guardrails"
          icon={<Shield className="size-5" />}
        />
      </div>
    </div>
  )
}

export default GuardrailsPage
