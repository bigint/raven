import type { Database } from "@raven/db";
import { budgets, users } from "@raven/db";
import { sendBudgetAlertEmail } from "@raven/email";
import { eq } from "drizzle-orm";
import type { Redis } from "ioredis";

interface EventPayload {
  data: Record<string, unknown>;
  timestamp: string;
  type: string;
}

const isEmailConfigured = (): boolean => !!process.env.RESEND_API_KEY;

const handleBudgetAlert = async (
  db: Database,
  data: Record<string, unknown>
): Promise<void> => {
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
        admin.email,
        budgetName,
        spent,
        limitAmount,
        threshold
      )
    )
  );
};

export const initEmailDispatcher = (
  db: Database,
  redis: Redis,
  appUrl: string
): void => {
  if (!isEmailConfigured()) {
    console.log("Email dispatcher: RESEND_API_KEY not set, skipping");
    return;
  }

  const subscriber = redis.duplicate();

  subscriber.on("error", (err) => {
    console.error("Email dispatcher Redis error:", err);
  });

  subscriber.subscribe("raven:events").catch((err) => {
    console.error("Failed to subscribe to events for email:", err);
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
            await handleBudgetAlert(db, event.data);
            break;
        }
      } catch (err) {
        console.error(`Email dispatcher error (${event.type}):`, err);
      }
    })();
  });

  console.log("Email dispatcher: listening for events");
};
