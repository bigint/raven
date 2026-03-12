export default function BudgetsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Budgets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set spending limits and track budget usage.
        </p>
      </div>
      <div className="rounded-xl border border-border p-8 text-center">
        <p className="text-muted-foreground">No budgets configured yet.</p>
      </div>
    </div>
  )
}
