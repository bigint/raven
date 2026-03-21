import type { Database } from "@raven/db";
import { settings } from "@raven/db";
import type { EmailConfig } from "@raven/email";
import { inArray } from "drizzle-orm";

export const getEmailConfig = async (
  db: Database
): Promise<EmailConfig | null> => {
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, ["resend_api_key", "resend_from_email"]));

  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const apiKey = map.resend_api_key;
  if (!apiKey) return null;

  return {
    apiKey,
    fromEmail: map.resend_from_email || undefined
  };
};
