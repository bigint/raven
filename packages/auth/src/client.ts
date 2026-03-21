import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const createBetterAuthClient = (baseURL: string) => {
  return createAuthClient({
    baseURL,
    fetchOptions: {
      credentials: "include"
    },
    plugins: [
      inferAdditionalFields({
        user: {
          avatarUrl: { required: false, type: "string" },
          role: { defaultValue: "viewer", type: "string" }
        }
      })
    ]
  });
};

export type AuthClient = ReturnType<typeof createBetterAuthClient>;
