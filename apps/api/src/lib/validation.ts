import { zValidator } from "@hono/zod-validator";
import type { ZodSchema } from "zod";
import { ValidationError } from "@/lib/errors";

export const jsonValidator = <T extends ZodSchema>(schema: T) =>
  zValidator("json", schema, (result) => {
    if (!result.success) {
      throw new ValidationError("Invalid request body", {
        errors: (
          result.error as unknown as {
            flatten: () => { fieldErrors: Record<string, string[]> };
          }
        ).flatten().fieldErrors
      });
    }
  });

export const queryValidator = <T extends ZodSchema>(schema: T) =>
  zValidator("query", schema, (result) => {
    if (!result.success) {
      throw new ValidationError("Invalid query parameters", {
        errors: (
          result.error as unknown as {
            flatten: () => { fieldErrors: Record<string, string[]> };
          }
        ).flatten().fieldErrors
      });
    }
  });
