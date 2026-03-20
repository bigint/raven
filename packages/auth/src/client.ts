import { createAuthClient } from "better-auth/react";

export const createBetterAuthClient = (baseURL: string) => {
  return createAuthClient({
    baseURL,
    fetchOptions: {
      credentials: "include"
    }
  });
};

export type AuthClient = ReturnType<typeof createBetterAuthClient>;
