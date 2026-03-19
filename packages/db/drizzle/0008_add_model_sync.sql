CREATE TABLE IF NOT EXISTS "synced_providers" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_enabled" boolean NOT NULL DEFAULT true,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "models" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"category" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"context_window" integer DEFAULT 0 NOT NULL,
	"max_output" integer DEFAULT 0 NOT NULL,
	"input_price" numeric(10, 4) DEFAULT '0' NOT NULL,
	"output_price" numeric(10, 4) DEFAULT '0' NOT NULL,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "models_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "models" ADD CONSTRAINT "models_provider_synced_providers_slug_fk" FOREIGN KEY ("provider") REFERENCES "public"."synced_providers"("slug") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
