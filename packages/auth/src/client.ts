import { createAuthClient } from 'better-auth/react'
import { organizationClient } from 'better-auth/client/plugins'

export const createBetterAuthClient = (baseURL: string) => {
  return createAuthClient({
    baseURL,
    plugins: [organizationClient()],
  })
}

export type AuthClient = ReturnType<typeof createBetterAuthClient>
