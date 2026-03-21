import type { Database } from "@raven/db";
import { sendPasswordResetEmail as send } from "@raven/email";
import { getEmailConfig } from "./email-config";

export const sendPasswordResetEmail = async (
  db: Database,
  user: { email: string },
  resetUrl: string
): Promise<void> => {
  const config = await getEmailConfig(db);
  if (!config) return;

  try {
    await send(config, user.email, resetUrl);
  } catch (err) {
    console.error("Failed to send password reset email:", err);
  }
};
