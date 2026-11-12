import { Router, type IRouter, type RequestHandler } from "express";
import healthRouter from "./health";
import specsRouter from "./specs";
import anthropicRouter from "./anthropic";
import authRouter from "./auth";
import webhooksRouter from "./webhooks";
import presenceRouter from "./presence";
import insightsRouter from "./insights";
import notificationsRouter from "./notifications";
import versionsRouter from "./versions";
import exportRouter from "./export";
import teamsRouter from "./teams";
import preferencesRouter from "./preferences";
import githubSyncRouter from "./github-sync";
import searchRouter from "./search";
import specDependenciesRouter from "./spec-dependencies";
import teamKnowledgeRouter from "./team-knowledge";
import auditLogsRouter from "./audit-logs";
import prAgentRouter from "./pr-agent";
import specConflictsRouter from "./spec-conflicts";
import specHealthRouter from "./spec-health";
import linearSyncRouter from "./linear-sync";
import integrationsRouter from "./integrations";
import specAnnotationsRouter from "./spec-annotations";
import statsRouter from "./stats";

import { requireSpecAccess, requireTeamAccess } from "../middlewares/resourceAccess";
import { getSharedSpec } from "./specs";

const router: IRouter = Router();

// This API runs on one instance. Expire rate limits without retaining inactive users.
const writeLimits = new Map<string, { count: number; expires: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [userId, limit] of writeLimits) if (limit.expires <= now) writeLimits.delete(userId);
}, 60_000).unref();

const limitWrites: RequestHandler = (req, res, next) => {
  if (req.method !== "POST") { next(); return; }
  const userId = req.user!.id;
  const now = Date.now();
  const current = writeLimits.get(userId);
  const limit = current && current.expires > now ? current : { count: 0, expires: now + 60_000 };
  if (limit.count >= 15) {
    res.set("Retry-After", String(Math.ceil((limit.expires - now) / 1000)));
    res.status(429).json({ error: "Too many requests. Try again shortly." });
    return;
  }
  limit.count++;
  writeLimits.set(userId, limit);
  next();
};

router.use(healthRouter);
router.use(authRouter);
router.get("/specs/share/:token", getSharedSpec);
router.use(webhooksRouter);
router.use((req, res, next) => {
  if (!req.user) { res.status(401).json({ error: "Authentication required" }); return; }
  next();
});
router.use(limitWrites);
router.use("/specs", specDependenciesRouter);
router.use("/specs/:specId", (req, res, next) => {
  if (["recent", "linear-teams"].includes(req.params.specId.toLowerCase()) && req.path === "/" && ["GET", "HEAD"].includes(req.method)) { next(); return; }
  requireSpecAccess(req, res, next);
});
router.use("/specs", linearSyncRouter);
router.use("/specs", specsRouter);
router.use("/specs", versionsRouter);
router.use("/specs", exportRouter);
router.use("/specs", githubSyncRouter);
router.use(searchRouter);
router.use("/teams/:teamId", requireTeamAccess);
router.use("/teams", teamsRouter);
router.use("/teams", teamKnowledgeRouter);
router.use("/teams", auditLogsRouter);
router.use("/specs", prAgentRouter);
router.use("/specs", specHealthRouter);
router.use("/teams", specConflictsRouter);
router.use("/anthropic", anthropicRouter);
router.use(presenceRouter);
router.use(insightsRouter);
router.use(notificationsRouter);
router.use(preferencesRouter);
router.use(integrationsRouter);
router.use("/specs", specAnnotationsRouter);
router.use(statsRouter);

export default router;
