import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const auditActionEnum = [
  "spec.created", "spec.generated", "spec.deleted", "spec.shared",
  "spec.exported_pdf", "spec.exported_docx", "spec.exported_notion",
  "spec.synced", "spec.version_restored",
  "team.created", "team.updated", "team.deleted",
  "team.member_added", "team.member_removed", "team.member_role_changed",
  "team.prompt_updated", "team.sso_configured",
  "knowledge.uploaded", "knowledge.deleted",
  "sso.login", "sso.logout",
  "auth.login", "auth.logout",
] as const;

export type AuditAction = typeof auditActionEnum[number];

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id"),
  userId: text("user_id"),
  username: text("username"),
  action: text("action").notNull(),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
export type InsertAuditLog = typeof auditLogsTable.$inferInsert;
