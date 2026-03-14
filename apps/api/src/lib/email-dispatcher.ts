import type { Database } from "@raven/db";
import { budgets, members, organizations, users } from "@raven/db";
import { sendBudgetAlertEmail, sendInvitationEmail } from "@raven/email";
import { and, eq } from "drizzle-orm";
import type { Redis } from "ioredis";

interface EventPayload {
  data: Record<string, unknown>;
  timestamp: string;
  type: string;
}

const isEmailConfigured = (): boolean => !!process.env.RESEND_API_KEY;

const handleInvitationCreated = async (
  db: Database,
  appUrl: string,
  data: Record<string, unknown>
): Promise<void> => {
  const email = data.email as string;
  const orgId = data.organizationId as string;
  const inviterId = data.inviterId as string;
  if (!email || !orgId || !inviterId) return;

  const [[org], [inviter]] = await Promise.all([
    db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1),
    db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, inviterId))
      .limit(1)
  ]);

  await sendInvitationEmail(
    email,
    inviter?.name ?? "A teammate",
    org?.name ?? "an organization",
    `${appUrl}/sign-in`
  );
};

const handleBudgetAlert = async (
  db: Database,
  orgId: string,
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

  const orgAdmins = await db
    .select({ email: users.email })
    .from(members)
    .innerJoin(users, eq(users.id, members.userId))
    .where(and(eq(members.organizationId, orgId), eq(members.role, "owner")));

  await Promise.all(
    orgAdmins.map((admin) =>
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

  subscriber.psubscribe("org:*:events").catch((err) => {
    console.error("Failed to subscribe to events for email:", err);
  });

  subscriber.on("pmessage", (_pattern, channel, message) => {
    const orgId = channel.split(":")[1];
    if (!orgId) return;

    let event: EventPayload;
    try {
      event = JSON.parse(message) as EventPayload;
    } catch {
      return;
    }

    void (async () => {
      try {
        switch (event.type) {
          case "invitation.created":
            await handleInvitationCreated(db, appUrl, event.data);
            break;
          case "budget.alert":
            await handleBudgetAlert(db, orgId, event.data);
            break;
        }
      } catch (err) {
        console.error(`Email dispatcher error (${event.type}):`, err);
      }
    })();
  });

  console.log("Email dispatcher: listening for events");
};
