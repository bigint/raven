import { EmptyState } from '@/components/shared/empty-state'
import { Shield } from 'lucide-react'

export default function GuardrailsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[13px] font-semibold text-[#fafafa]">Guardrails</h1>
      </div>

      <div className="flex items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] py-16">
        <EmptyState
          title="Coming Soon"
          description="Content filtering and safety guardrails"
          icon={<Shield className="h-5 w-5" />}
        />
      </div>
    </div>
  )
}
