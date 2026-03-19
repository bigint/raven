CREATE TABLE "model_aliases" (
	"alias" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"target_model" text NOT NULL,
	CONSTRAINT "model_aliases_alias_org_unique" UNIQUE("alias","organization_id")
);
--> statement-breakpoint
ALTER TABLE "model_aliases" ADD CONSTRAINT "model_aliases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "model_aliases_org_idx" ON "model_aliases" USING btree ("organization_id");