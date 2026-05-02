import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const specTypeEnum = ["system_design", "api_design", "database_schema", "feature_spec"] as const;
export const inputTypeEnum = ["github_url", "description"] as const;
export const statusEnum = ["pending", "generating", "completed", "failed"] as const;

export const specsTable = pgTable("specs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  specType: text("spec_type", { enum: specTypeEnum }).notNull(),
  inputType: text("input_type", { enum: inputTypeEnum }).notNull(),
  inputValue: text("input_value").notNull(),
  content: text("content").notNull().default(""),
  status: text("status", { enum: statusEnum }).notNull().default("pending"),
  complexityScore: integer("complexity_score"),
  techDebtRisks: jsonb("tech_debt_risks").$type<TechDebtRisk[]>(),
  complexitySummary: text("complexity_summary"),
  mermaidDiagram: text("mermaid_diagram"),
  conversationId: integer("conversation_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export interface TechDebtRisk {
  title: string;
  severity: "high" | "medium" | "low";
  description: string;
}

export const insertSpecSchema = createInsertSchema(specsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSpec = z.infer<typeof insertSpecSchema>;
export type Spec = typeof specsTable.$inferSelect;
