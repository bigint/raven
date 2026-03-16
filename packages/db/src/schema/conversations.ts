import { createId } from "@paralleldrive/cuid2";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const conversations = pgTable(
  "conversations",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    externalId: text("external_id"),
    id: text("id").primaryKey().$defaultFn(createId),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    messageCount: integer("message_count").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    model: text("model"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    systemPrompt: text("system_prompt"),
    title: text("title").default(""),
    totalTokens: integer("total_tokens").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => [
    index("conversations_org_idx").on(t.organizationId),
    index("conversations_external_idx").on(t.externalId)
  ]
);

export const conversationMessages = pgTable(
  "conversation_messages",
  {
    content: text("content").notNull(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: text("id").primaryKey().$defaultFn(createId),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    role: text("role").notNull(),
    tokenCount: integer("token_count").notNull().default(0)
  },
  (t) => [index("conversation_messages_conv_idx").on(t.conversationId)]
);
