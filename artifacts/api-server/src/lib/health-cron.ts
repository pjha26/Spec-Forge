/**
 * Nightly spec health monitoring cron job
 * Runs at 2 AM every night for all completed GitHub-backed specs.
 * Weekly digest: every Sunday at 8 AM
 * Daily digest:  every day at 8 AM
 */

import cron from "node-cron";
import { db, specsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { runHealthAnalysis } from "../routes/spec-health.js";
import { sendAllDigests } from "./digest.js";
import { logger } from "./logger.js";

export function startHealthCron(): void {
  // ── Nightly health analysis at 2:00 AM ──────────────────────────────────
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
        await new Promise(r => setTimeout(r, 2000));
      }

      logger.info("Nightly health analysis complete");
    } catch (err) {
      logger.error({ err }, "Nightly health cron failed");
    }
  });

  // ── Weekly digest every Sunday at 8:00 AM ───────────────────────────────
  cron.schedule("0 8 * * 0", async () => {
    logger.info("Sending weekly spec health digests");
    try {
      await sendAllDigests("weekly");
    } catch (err) {
      logger.error({ err }, "Weekly digest cron failed");
    }
  });

  // ── Daily digest every day at 8:00 AM ───────────────────────────────────
  cron.schedule("0 8 * * *", async () => {
    logger.info("Sending daily spec health digests");
    try {
      await sendAllDigests("daily");
    } catch (err) {
      logger.error({ err }, "Daily digest cron failed");
    }
  });

  logger.info("Spec health monitoring cron scheduled (nightly at 2 AM · weekly digest Sun 8 AM · daily digest 8 AM)");
}
