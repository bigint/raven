import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { inviteUser, listInvitations, revokeInvitation } from "./invitations";
import { changeRole, listMembers, removeMember } from "./members";
import { changeRoleSchema, inviteSchema } from "./schema";

export const createTeamsModule = (db: Database) => {
  const app = new Hono();

  // Members
  app.get("/members", listMembers(db));
  app.delete("/members/:id", removeMember(db));
  app.put("/members/:id/role", jsonValidator(changeRoleSchema), changeRole(db));

  // Invitations
  app.post("/invitations", jsonValidator(inviteSchema), inviteUser(db));
  app.get("/invitations", listInvitations(db));
  app.delete("/invitations/:id", revokeInvitation(db));

  return app;
};
