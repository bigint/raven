ALTER TABLE "organizations" RENAME COLUMN "paddle_customer_id" TO "lemonsqueezy_customer_id";--> statement-breakpoint
ALTER TABLE "subscriptions" RENAME COLUMN "paddle_subscription_id" TO "lemonsqueezy_subscription_id";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_paddle_subscription_id_unique";--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_lemonsqueezy_subscription_id_unique" UNIQUE("lemonsqueezy_subscription_id");
