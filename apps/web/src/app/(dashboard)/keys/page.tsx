export default function KeysPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Keys</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your virtual API keys.
        </p>
      </div>
      <div className="rounded-xl border border-border p-8 text-center">
        <p className="text-muted-foreground">No keys created yet.</p>
      </div>
    </div>
  )
}
