ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_lemonsqueezy_subscription_id_unique";--> statement-breakpoint
ALTER TABLE "budgets" DROP COLUMN "period_start";--> statement-breakpoint
ALTER TABLE "models" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "lemonsqueezy_customer_id";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "lemonsqueezy_subscription_id";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "seats";