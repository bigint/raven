import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent } from '@/components/ui/card'
import { Shield } from 'lucide-react'

export default function GuardrailsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-base font-semibold text-[#fafafa]">Guardrails</h1>
      </div>

      <Card>
        <CardContent>
          <EmptyState
            title="Guardrails coming soon"
            description="Configure content filtering, PII detection, and custom safety rules for your AI gateway."
            icon={<Shield className="h-8 w-8 text-[#525252]" />}
          />
        </CardContent>
      </Card>
    </div>
  )
}
