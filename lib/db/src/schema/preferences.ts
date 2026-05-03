import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const userPreferencesTable = pgTable("user_preferences", {
  userId: text("user_id").primaryKey(),
  preferredStack: text("preferred_stack"),
  domain: text("domain"),
  alwaysIncludeSections: jsonb("always_include_sections").$type<string[]>(),
  preferredModel: text("preferred_model"),
  defaultSpecType: text("default_spec_type"),
  extraContext: text("extra_context"),
  linearApiKey: text("linear_api_key"),
  linearTeamId: text("linear_team_id"),
  jiraApiKey: text("jira_api_key"),
  jiraBaseUrl: text("jira_base_url"),
  jiraProjectKey: text("jira_project_key"),
  slackWebhookUrl: text("slack_webhook_url"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserPreferences = typeof userPreferencesTable.$inferSelect;
export type UpsertUserPreferences = typeof userPreferencesTable.$inferInsert;
