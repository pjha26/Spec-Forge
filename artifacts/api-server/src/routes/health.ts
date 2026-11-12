import { Router, type IRouter } from "express";
import { localAIEnabled, localVisionEnabled } from "../lib/model-router";
import { pool } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/readyz", async (_req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const query = { text: "SELECT 1", query_timeout: 2000 };
    await pool.query(query);
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});

router.get("/capabilities", (_req, res) => { res.json({ localAI: localAIEnabled, localVision: localVisionEnabled, githubAutoSync: process.env.ENABLE_GITHUB_AUTO_SYNC === "true", notionExport: Boolean(process.env.NOTION_API_KEY) }); });

export default router;
