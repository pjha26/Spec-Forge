import express, { type Express } from "express";
import path from "node:path";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";
import { initDevUser } from "./lib/dev-mode.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0].replace(/^(\/api)?\/(specs\/)?share\/[^/]+/i, "$1/$2share/[redacted]"),
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cookieParser());
app.use(express.json({
  limit: "3mb",
  verify(req, _res, buffer) {
    if (req.url?.split("?")[0] === "/api/webhooks/github") Object.assign(req, { rawBody: buffer });
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);
app.use("/api", (_req, res) => { res.status(404).json({ error: "API route not found" }); });
app.use("/api", (err: { status?: number }, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) { next(err); return; }
  const status = err.status === 400 || err.status === 413 ? err.status : 500;
  res.status(status).json({ error: status === 413 ? "Request too large" : status === 400 ? "Invalid request body" : "Internal server error" });
});

const staticDir = process.env.STATIC_DIR;
if (staticDir) {
  const publicDir = path.resolve(staticDir, "public");
  app.use(express.static(publicDir));
  app.get(/.*/, (_req, res) => { res.sendFile(path.join(publicDir, "index.html")); });
}

// Ensure the dev user row exists before the first request arrives
initDevUser().catch(() => {});

export default app;
