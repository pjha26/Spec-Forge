import { Router, type IRouter } from "express";
import healthRouter from "./health";
import specsRouter from "./specs";
import anthropicRouter from "./anthropic";
import authRouter from "./auth";
import webhooksRouter from "./webhooks";
import presenceRouter from "./presence";
import insightsRouter from "./insights";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use("/specs", specsRouter);
router.use("/anthropic", anthropicRouter);
router.use(webhooksRouter);
router.use(presenceRouter);
router.use(insightsRouter);
router.use(notificationsRouter);

export default router;
