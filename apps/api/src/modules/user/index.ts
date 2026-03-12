import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import {
  acceptInvitation,
  declineInvitation,
  listInvitations
} from "./invitations";
import { createOrg, listOrgs } from "./orgs";
import { updateProfile } from "./profile";
import { createOrgSchema, updateProfileSchema } from "./schema";

export const createUserModule = (db: Database) => {
  const app = new Hono();
  app.put("/profile", jsonValidator(updateProfileSchema), updateProfile(db));
  app.get("/invitations", listInvitations(db));
  app.post("/invitations/:id/accept", acceptInvitation(db));
  app.post("/invitations/:id/decline", declineInvitation(db));
  app.get("/orgs", listOrgs(db));
  app.post("/orgs", jsonValidator(createOrgSchema), createOrg(db));
  return app;
};
