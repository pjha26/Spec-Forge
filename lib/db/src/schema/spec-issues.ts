import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const specIssuesTable = pgTable("spec_issues", {
  id: serial("id").primaryKey(),
  specId: integer("spec_id").notNull(),
  sectionTitle: text("section_title").notNull(),
  issueTitle: text("issue_title").notNull(),
  issueId: text("issue_id").notNull(),
  issueUrl: text("issue_url").notNull(),
  platform: text("platform").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SpecIssue = typeof specIssuesTable.$inferSelect;
