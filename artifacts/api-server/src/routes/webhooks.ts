import { Router } from "express";
import { db, specsTable } from "@workspace/db";
import { and, eq, isNotNull } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "node:crypto";
import { parseGitHubRepo } from "../lib/github-source";
import { claimGeneration, runSpecGeneration } from "./specs";

const router = Router();

router.post("/webhooks/github", async (req, res) => {
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
  const specs = await db.select({
    id: specsTable.id, input: specsTable.inputValue, secret: specsTable.webhookSecret, userId: specsTable.userId,
  }).from(specsTable).where(and(eq(specsTable.inputType, "github_url"), isNotNull(specsTable.webhookSecret)));
  let processed = 0;
  for (const spec of specs) {
    const source = parseGitHubRepo(spec.input);
    if (!source || !spec.secret || !spec.userId ||
        source.owner.toLowerCase() !== repo.owner.toLowerCase() || source.repo.toLowerCase() !== repo.repo.toLowerCase()) continue;
    const expected = createHmac("sha256", spec.secret).update(rawBody).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex")) || !await claimGeneration(spec.id, spec.userId)) continue;
    processed++;
    runSpecGeneration(spec.id, spec.userId).catch(err => req.log.error({ err }, "GitHub sync failed"));
  }
  res.json({ processed });
});

export default router;
