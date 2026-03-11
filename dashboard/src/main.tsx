import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './app.css'
import { Shell } from '@/components/layout/shell'
import { hasApiKey } from '@/lib/api'
import AnalyticsPage from '@/pages/analytics'
import BudgetsPage from '@/pages/budgets'
import CachePage from '@/pages/cache'
import GuardrailsPage from '@/pages/guardrails'
import KeysPage from '@/pages/keys'
import LoginPage from '@/pages/login'
import ModelsPage from '@/pages/models'
import OverviewPage from '@/pages/overview'
import PluginsPage from '@/pages/plugins'
import ProvidersPage from '@/pages/providers'
import RequestsPage from '@/pages/requests'
import SettingsPage from '@/pages/settings'
import TeamsPage from '@/pages/teams'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  const [authenticated, setAuthenticated] = useState(hasApiKey())

  if (!authenticated) {
    return <LoginPage onLogin={() => setAuthenticated(true)} />
  }

  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/providers" element={<ProvidersPage />} />
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/keys" element={<KeysPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/cache" element={<CachePage />} />
          <Route path="/guardrails" element={<GuardrailsPage />} />
          <Route path="/plugins" element={<PluginsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
