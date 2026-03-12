import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().min(1).max(100)
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(100)
});

export const addTeamMemberSchema = z.object({
  role: z.enum(["lead", "member"]).default("member"),
  userId: z.string().min(1)
});

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]).default("member")
});

export const changeRoleSchema = z.object({
  role: z.enum(["admin", "member", "viewer"])
});
