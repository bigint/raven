import { createBetterAuthClient } from '@raven/auth/client'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const authClient = createBetterAuthClient(API_URL)

export const { useSession, signIn, signUp, signOut, useActiveOrganization, useListOrganizations } =
  authClient
