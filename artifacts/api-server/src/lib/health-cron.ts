/**
 * Nightly spec health monitoring cron job
 * Runs at 2 AM every night for all completed GitHub-backed specs
 */

import cron from "node-cron";
import { db, specsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { runHealthAnalysis } from "../routes/spec-health.js";
import { logger } from "./logger.js";

export function startHealthCron(): void {
  // Run nightly at 2:00 AM
  cron.schedule("0 2 * * *", async () => {
    logger.info("Starting nightly spec health analysis");
    try {
      const specs = await db
        .select({ id: specsTable.id, title: specsTable.title })
        .from(specsTable)
        .where(and(eq(specsTable.status, "completed"), eq(specsTable.inputType, "github_url")));

      logger.info({ count: specs.length }, "Running health analysis on GitHub-backed specs");

      for (const spec of specs) {
        try {
          await runHealthAnalysis(spec.id, "cron");
          logger.info({ specId: spec.id, title: spec.title }, "Health analysis complete");
        } catch (err) {
          logger.error({ err, specId: spec.id }, "Health analysis failed for spec");
        }
        // Stagger requests to avoid rate limiting
        await new Promise(r => setTimeout(r, 2000));
      }

      logger.info("Nightly health analysis complete");
    } catch (err) {
      logger.error({ err }, "Nightly health cron failed");
    }
  });

  logger.info("Spec health monitoring cron scheduled (nightly at 2 AM)");
}
