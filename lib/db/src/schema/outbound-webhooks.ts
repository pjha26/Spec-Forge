import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const outboundWebhooksTable = pgTable("outbound_webhooks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  eventType: text("event_type").notNull(),
  url: text("url").notNull(),
  secret: text("secret"),
  enabled: boolean("enabled").notNull().default(true),
  lastTriggeredAt: timestamp("last_triggered_at"),
  lastStatus: integer("last_status"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type OutboundWebhook = typeof outboundWebhooksTable.$inferSelect;
