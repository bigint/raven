import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent } from '@/components/ui/card'
import { Shield } from 'lucide-react'

export default function GuardrailsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-dark">Guardrails</h1>
        <p className="text-sm text-text-dark-secondary mt-1">
          Configure content filtering and safety guardrails
        </p>
      </div>

      <Card>
        <CardContent>
          <EmptyState
            title="Guardrails coming soon"
            description="Configure content filtering, PII detection, and custom safety rules for your AI gateway."
            icon={<Shield className="h-8 w-8 text-text-dark-secondary" />}
          />
        </CardContent>
      </Card>
    </div>
  )
}
