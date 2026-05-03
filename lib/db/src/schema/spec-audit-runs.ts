import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export interface AuditDiscrepancy {
  section: string;
  issue: string;
  severity: "high" | "medium" | "low";
  suggestion: string;
}

export const specAuditRunsTable = pgTable("spec_audit_runs", {
  id: serial("id").primaryKey(),
  specId: integer("spec_id").notNull(),
  triggeredBy: text("triggered_by").notNull(),
  status: text("status", { enum: ["pending", "running", "completed", "failed"] }).notNull().default("pending"),
  discrepancies: jsonb("discrepancies").$type<AuditDiscrepancy[]>(),
  summary: text("summary"),
  commitSha: text("commit_sha"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export type SpecAuditRun = typeof specAuditRunsTable.$inferSelect;
