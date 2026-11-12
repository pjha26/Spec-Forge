import app from "./app";
import { db, specsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./lib/logger";
import { startHealthCron } from "./lib/health-cron";

if (!process.env.OPENAI_API_KEY && !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
  throw new Error("Set OPENAI_API_KEY or configure the Replit OpenAI integration");
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// A single API instance owns generation. Release jobs interrupted by its restart.
if (process.env.NODE_ENV === "production") {
  await db.update(specsTable).set({ status: "failed", updatedAt: new Date() })
    .where(eq(specsTable.status, "generating"));
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startHealthCron();
});
