import { Router, type Request, type Response } from "express";
import { db, userPreferencesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/preferences", async (req: Request, res: Response) => {
  const userId = (req as any).session?.user?.id as string | undefined;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  try {
    const [prefs] = await db.select().from(userPreferencesTable).where(eq(userPreferencesTable.userId, userId));
    res.json(prefs ?? { userId, preferredStack: null, domain: null, alwaysIncludeSections: [], preferredModel: null, defaultSpecType: null, extraContext: null });
  } catch (err) {
    req.log.error({ err }, "Failed to get preferences");
    res.status(500).json({ error: "Failed to get preferences" });
  }
});

router.put("/preferences", async (req: Request, res: Response) => {
  const userId = (req as any).session?.user?.id as string | undefined;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { preferredStack, domain, alwaysIncludeSections, preferredModel, defaultSpecType, extraContext } = req.body;

  try {
    const [prefs] = await db
      .insert(userPreferencesTable)
      .values({ userId, preferredStack, domain, alwaysIncludeSections, preferredModel, defaultSpecType, extraContext, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userPreferencesTable.userId,
        set: { preferredStack, domain, alwaysIncludeSections, preferredModel, defaultSpecType, extraContext, updatedAt: new Date() },
      })
      .returning();
    res.json(prefs);
  } catch (err) {
    req.log.error({ err }, "Failed to save preferences");
    res.status(500).json({ error: "Failed to save preferences" });
  }
});

export default router;
