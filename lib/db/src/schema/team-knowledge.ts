import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const docTypeEnum = ["spec", "adr", "decision", "doc", "runbook"] as const;

export const teamKnowledgeTable = pgTable("team_knowledge", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  docType: text("doc_type", { enum: docTypeEnum }).notNull().default("doc"),
  wordCount: integer("word_count").notNull().default(0),
  uploadedBy: text("uploaded_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type TeamKnowledge = typeof teamKnowledgeTable.$inferSelect;
export type InsertTeamKnowledge = typeof teamKnowledgeTable.$inferInsert;
