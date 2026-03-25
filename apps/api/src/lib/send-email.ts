import type { Database } from "@raven/db";
import {
  sendPasswordResetEmail as sendReset,
  sendWelcomeEmail as sendWelcome
} from "@raven/email";
import { getEmailConfig } from "./email-config";
import { log } from "./logger";

export const sendWelcomeEmail = async (
  db: Database,
  user: { name: string; email: string },
  appUrl: string
): Promise<void> => {
  const config = await getEmailConfig(db);
  if (!config) return;

  try {
    await sendWelcome(config, user.email, user.name, appUrl);
  } catch (err) {
    log.error("Failed to send welcome email", err);
  }
};

export const sendPasswordResetEmail = async (
  db: Database,
  user: { email: string },
  resetUrl: string
): Promise<void> => {
  const config = await getEmailConfig(db);
  if (!config) return;

  try {
    await sendReset(config, user.email, resetUrl);
  } catch (err) {
    log.error("Failed to send password reset email", err);
  }
};
