import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const specVersionsTable = pgTable("spec_versions", {
  id: serial("id").primaryKey(),
  specId: integer("spec_id").notNull(),
  content: text("content").notNull(),
  complexityScore: integer("complexity_score"),
  techDebtRisks: text("tech_debt_risks"),
  complexitySummary: text("complexity_summary"),
  mermaidDiagram: text("mermaid_diagram"),
  triggeredBy: text("triggered_by").notNull().default("manual"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
