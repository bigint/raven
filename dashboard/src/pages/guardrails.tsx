import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent } from '@/components/ui/card'
import { Shield } from 'lucide-react'

export default function GuardrailsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Guardrails</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Configure content filtering and safety guardrails
        </p>
      </div>

      <Card>
        <CardContent>
          <EmptyState
            title="Guardrails coming soon"
            description="Configure content filtering, PII detection, and custom safety rules for your AI gateway."
            icon={<Shield className="h-8 w-8 text-zinc-600" />}
          />
        </CardContent>
      </Card>
    </div>
  )
}
