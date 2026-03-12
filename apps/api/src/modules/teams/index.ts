import type { Database } from "@raven/db";
import { Hono } from "hono";
import { inviteUser, listInvitations, revokeInvitation } from "./invitations";
import { changeRole, listMembers, removeMember } from "./members";
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  listTeams,
  removeTeamMember,
  updateTeam
} from "./teams";

export const createTeamsModule = (db: Database) => {
  const app = new Hono();

  // Members
  app.get("/members", listMembers(db));
  app.delete("/members/:id", removeMember(db));
  app.put("/members/:id/role", changeRole(db));

  // Invitations
  app.post("/invitations", inviteUser(db));
  app.get("/invitations", listInvitations(db));
  app.delete("/invitations/:id", revokeInvitation(db));

  // Teams
  app.get("/teams", listTeams(db));
  app.post("/teams", createTeam(db));
  app.put("/teams/:id", updateTeam(db));
  app.delete("/teams/:id", deleteTeam(db));
  app.post("/teams/:id/members", addTeamMember(db));
  app.delete("/teams/:id/members/:userId", removeTeamMember(db));

  return app;
};
