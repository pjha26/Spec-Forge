import { Router } from "express";
import { db, githubRepoKey, specsTable } from "@workspace/db";
import { and, isNotNull, sql } from "drizzle-orm";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { parseGitHubRepo } from "../lib/github-source";
import { claimGeneration, runSpecGeneration } from "./specs";

const router = Router();

router.post("/webhooks/github", async (req, res) => {
  if (process.env.ENABLE_GITHUB_AUTO_SYNC !== "true") {
    res.status(503).json({ error: "GitHub auto-sync is disabled. Use manual sync." });
    return;
  }
  const signature = req.get("x-hub-signature-256");
  const rawBody = (req as typeof req & { rawBody?: Buffer }).rawBody;
  if (!rawBody || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }
  const repo = typeof req.body?.repository?.html_url === "string" && parseGitHubRepo(req.body.repository.html_url);
  if (!repo || req.get("x-github-event") !== "push" ||
      req.body.ref !== "refs/heads/" + req.body.repository.default_branch) {
    res.json({ processed: 0 });
    return;
  }
  const key = ("https://github.com/" + repo.owner + "/" + repo.repo).toLowerCase();
  const digest = createHash("sha256").update(rawBody).digest("hex");
  const specs = await db.select({
    id: specsTable.id, secret: specsTable.webhookSecret, userId: specsTable.userId,
  }).from(specsTable).where(and(sql`"input_type" = 'github_url'`, isNotNull(specsTable.webhookSecret), sql`${githubRepoKey} = ${key}`));
  let processed = 0;
  for (const spec of specs) {
    if (!spec.secret || !spec.userId) continue;
    const expected = createHmac("sha256", spec.secret).update(rawBody).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex")) || !await claimGeneration(spec.id, spec.userId, digest)) continue;
    processed++;
    runSpecGeneration(spec.id, spec.userId).catch(err => req.log.error({ err }, "GitHub sync failed"));
  }
  res.json({ processed });
});

export default router;
