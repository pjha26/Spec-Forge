import { Router, type IRouter } from "express";
import healthRouter from "./health";
import specsRouter from "./specs";
import anthropicRouter from "./anthropic";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/specs", specsRouter);
router.use("/anthropic", anthropicRouter);

export default router;
