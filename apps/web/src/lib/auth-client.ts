import { createBetterAuthClient } from "@raven/auth/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const authClient = createBetterAuthClient(API_URL);

export const { signIn, signOut, signUp, useSession } = authClient;

export const forgetPassword = async ({
  email,
  redirectTo
}: {
  email: string;
  redirectTo: string;
}) => {
  const res = await fetch(`${API_URL}/api/auth/forget-password`, {
    body: JSON.stringify({ email, redirectTo }),
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to send reset email");
  return res.json();
};

export const resetPassword = async ({
  newPassword,
  token
}: {
  newPassword: string;
  token: string;
}) => {
  const res = await fetch(`${API_URL}/api/auth/reset-password`, {
    body: JSON.stringify({ newPassword, token }),
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to reset password");
  return res.json();
};
