import type { Database } from "@raven/db";
import { sendWelcomeEmail as send } from "@raven/email";
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
    await send(config, user.email, user.name, appUrl);
  } catch (err) {
    log.error("Failed to send welcome email", err);
  }
};
