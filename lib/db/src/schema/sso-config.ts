import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const ssoConfigTable = pgTable("sso_config", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().unique(),
  provider: text("provider").notNull().default("saml"),
  entityId: text("entity_id").notNull(),
  ssoUrl: text("sso_url").notNull(),
  certificate: text("certificate").notNull(),
  spEntityId: text("sp_entity_id").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SsoConfig = typeof ssoConfigTable.$inferSelect;
export type InsertSsoConfig = typeof ssoConfigTable.$inferInsert;
