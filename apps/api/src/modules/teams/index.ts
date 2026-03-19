import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { inviteUser, listInvitations, revokeInvitation } from "./invitations";
import { listMembers, removeMember } from "./members";
import { inviteSchema } from "./schema";

export const createTeamsModule = (db: Database) => {
  const app = new Hono();

  // Members
  app.get("/members", listMembers(db));
  app.delete("/members/:id", removeMember(db));

  // Invitations
  app.post("/invitations", jsonValidator(inviteSchema), inviteUser(db));
  app.get("/invitations", listInvitations(db));
  app.delete("/invitations/:id", revokeInvitation(db));

  return app;
};
