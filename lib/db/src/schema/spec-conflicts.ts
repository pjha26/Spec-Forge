import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const conflictStatusEnum = ["open", "resolved", "dismissed"] as const;

export const specConflictsTable = pgTable("spec_conflicts", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  spec1Id: integer("spec1_id").notNull(),
  spec2Id: integer("spec2_id").notNull(),
  conflictType: text("conflict_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  spec1Excerpt: text("spec1_excerpt"),
  spec2Excerpt: text("spec2_excerpt"),
  suggestion: text("suggestion"),
  severity: text("severity", { enum: ["high", "medium", "low"] }).notNull().default("medium"),
  status: text("status", { enum: conflictStatusEnum }).notNull().default("open"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SpecConflict = typeof specConflictsTable.$inferSelect;
