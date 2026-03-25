import type { Database } from "@raven/db";
import { budgets, users } from "@raven/db";
import { sendBudgetAlertEmail } from "@raven/email";
import { eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import { getEmailConfig } from "./email-config";
import { getInstanceSettings } from "./instance-settings";
import { log } from "./logger";

interface EventPayload {
  data: Record<string, unknown>;
  timestamp: string;
  type: string;
}

const handleBudgetAlert = async (
  db: Database,
  redis: Redis,
  data: Record<string, unknown>
): Promise<void> => {
  const cfg = await getInstanceSettings(db, redis);
  if (!cfg.email_notifications_enabled || !cfg.notify_on_budget_exceeded)
    return;

  const config = await getEmailConfig(db);
  if (!config) return;

  const budgetId = data.budgetId as string;
  const spent = data.spent as number;
  const limitAmount = data.limitAmount as number;
  const threshold = data.threshold as number;
  if (!budgetId) return;

  const [budget] = await db
    .select({ entityId: budgets.entityId, entityType: budgets.entityType })
    .from(budgets)
    .where(eq(budgets.id, budgetId))
    .limit(1);
  const budgetName = budget
    ? `${budget.entityType}:${budget.entityId}`
    : budgetId;

  const adminUsers = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.role, "admin"));

  await Promise.all(
    adminUsers.map((admin) =>
      sendBudgetAlertEmail(
        config,
        admin.email,
        budgetName,
        spent,
        limitAmount,
        threshold
      )
    )
  );
};

export const initEmailDispatcher = (db: Database, redis: Redis): void => {
  const subscriber = redis.duplicate();

  subscriber.on("error", (err) => {
    log.error("Email dispatcher Redis error", err);
  });

  subscriber.subscribe("raven:events").catch((err) => {
    log.error("Failed to subscribe to events for email", err);
  });

  subscriber.on("message", (_channel, message) => {
    let event: EventPayload;
    try {
      event = JSON.parse(message) as EventPayload;
    } catch {
      return;
    }

    void (async () => {
      try {
        switch (event.type) {
          case "budget.alert":
            await handleBudgetAlert(db, redis, event.data);
            break;
        }
      } catch (err) {
        log.error("Email dispatcher error", err, { eventType: event.type });
      }
    })();
  });

  log.info("Email dispatcher: listening for events");
};
