import { apiClient, setApiKey } from '@/lib/api'
import { KeyRound, Loader2, ShieldAlert } from 'lucide-react'
import { type FormEvent, useState } from 'react'

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!key.trim()) return

    setLoading(true)
    setError('')

    try {
      // Temporarily set key to validate it.
      apiClient.setKey(key.trim())
      await apiClient.getSettings()
      setApiKey(key.trim())
      onLogin()
    } catch {
      apiClient.setKey('')
      setError('Invalid admin key. Please check and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Raven Gateway</h1>
          <p className="text-sm text-zinc-500 mt-2">Enter your admin API key to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Admin API key"
                className="w-full h-11 rounded-xl border border-white/10 bg-white/[3%] pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition-all"
                autoFocus
              />
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-400">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full h-11 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Continue'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-600 mt-6">
          Set via <code className="text-zinc-500">RAVEN_ADMIN_KEY</code> environment variable
        </p>
      </div>
    </div>
  )
}
