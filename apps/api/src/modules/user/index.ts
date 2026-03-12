import type { Database } from '@raven/db'
import { Hono } from 'hono'
import { acceptInvitation, declineInvitation, listInvitations } from './invitations.js'
import { createOrg, listOrgs } from './orgs.js'
import { updateProfile } from './profile.js'

export const createUserModule = (db: Database) => {
  const app = new Hono()
  app.put('/profile', updateProfile(db))
  app.get('/invitations', listInvitations(db))
  app.post('/invitations/:id/accept', acceptInvitation(db))
  app.post('/invitations/:id/decline', declineInvitation(db))
  app.get('/orgs', listOrgs(db))
  app.post('/orgs', createOrg(db))
  return app
}
