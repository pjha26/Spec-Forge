import app from "./app";
import { logger } from "./lib/logger";
import { startHealthCron } from "./lib/health-cron";

const required = ['DATABASE_URL', 'SESSION_SECRET'];
const aiKey = process.env.OPENAI_API_KEY || 
              process.env.GOOGLE_AI_API_KEY ||
              process.env.ANTHROPIC_API_KEY;

if (!aiKey) {
  console.error('MISSING: No AI API key found. Set OPENAI_API_KEY, GOOGLE_AI_API_KEY, or ANTHROPIC_API_KEY in .env');
  process.exit(1);
}

required.forEach(key => {
  if (!process.env[key]) {
    console.error(`MISSING ENV: ${key}`);
    process.exit(1);
  }
});

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

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startHealthCron();
});
