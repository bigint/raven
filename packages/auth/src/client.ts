import { organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const createBetterAuthClient = (baseURL: string) => {
  return createAuthClient({
    baseURL,
    plugins: [organizationClient()],
  })
}

export type AuthClient = ReturnType<typeof createBetterAuthClient>
