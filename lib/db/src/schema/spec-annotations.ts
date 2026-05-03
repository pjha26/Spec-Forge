import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const annotationStatusEnum = ["verified", "outdated", "missing"] as const;

export const specAnnotationsTable = pgTable("spec_annotations", {
  id: serial("id").primaryKey(),
  specId: integer("spec_id").notNull(),
  userId: text("user_id").notNull(),
  username: text("username").notNull().default(""),
  selectedText: text("selected_text").notNull().default(""),
  sectionTitle: text("section_title").notNull().default(""),
  status: text("status", { enum: annotationStatusEnum }).notNull().default("verified"),
  comment: text("comment").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAnnotationSchema = createInsertSchema(specAnnotationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAnnotation = z.infer<typeof insertAnnotationSchema>;
export type SpecAnnotation = typeof specAnnotationsTable.$inferSelect;
