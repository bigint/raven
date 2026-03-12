export default function ProvidersPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Providers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your AI provider API keys.
        </p>
      </div>
      <div className="rounded-xl border border-border p-8 text-center">
        <p className="text-muted-foreground">No providers configured yet.</p>
      </div>
    </div>
  )
}
