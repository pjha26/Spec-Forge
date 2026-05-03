import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const specDependenciesTable = pgTable("spec_dependencies", {
  id: serial("id").primaryKey(),
  sourceSpecId: integer("source_spec_id").notNull(),
  targetSpecId: integer("target_spec_id").notNull(),
  relationshipType: text("relationship_type").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("spec_dep_unique").on(table.sourceSpecId, table.targetSpecId, table.relationshipType),
]);

export type SpecDependency = typeof specDependenciesTable.$inferSelect;
