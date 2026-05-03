import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const userPreferencesTable = pgTable("user_preferences", {
  userId: text("user_id").primaryKey(),
  preferredStack: text("preferred_stack"),
  domain: text("domain"),
  alwaysIncludeSections: jsonb("always_include_sections").$type<string[]>(),
  preferredModel: text("preferred_model"),
  defaultSpecType: text("default_spec_type"),
  extraContext: text("extra_context"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserPreferences = typeof userPreferencesTable.$inferSelect;
export type UpsertUserPreferences = typeof userPreferencesTable.$inferInsert;
