import { integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { specsTable } from "./specs";

export const githubWebhookDeliveries = pgTable("github_webhook_deliveries", {
  specId: integer("spec_id").notNull().references(() => specsTable.id, { onDelete: "cascade" }),
  digest: text("digest").notNull(),
}, table => [primaryKey({ columns: [table.specId, table.digest] })]);
