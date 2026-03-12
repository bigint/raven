export default function RequestsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and inspect API request logs.
        </p>
      </div>
      <div className="rounded-xl border border-border p-8 text-center">
        <p className="text-muted-foreground">No requests logged yet.</p>
      </div>
    </div>
  )
}
