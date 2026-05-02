import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type", {
    enum: ["sync_complete", "sync_failed", "share_viewed"] as const,
  }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  specId: integer("spec_id"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;
