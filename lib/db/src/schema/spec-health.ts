import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export interface DriftItem {
  type: "missing_section" | "new_file_not_in_spec" | "implementation_differs" | "renamed";
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  filePath?: string;
  specSection?: string;
}

export const specHealthTable = pgTable("spec_health_reports", {
  id: serial("id").primaryKey(),
  specId: integer("spec_id").notNull(),
  alignmentScore: integer("alignment_score").notNull(),
  driftItems: jsonb("drift_items").$type<DriftItem[]>().notNull().default([]),
  summary: text("summary").notNull(),
  triggeredBy: text("triggered_by").notNull().default("cron"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SpecHealth = typeof specHealthTable.$inferSelect;
