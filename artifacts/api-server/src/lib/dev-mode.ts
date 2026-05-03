/**
 * Local development mode helpers.
 *
 * Set  LOCAL_DEV=true  in your .env to bypass Replit OIDC auth entirely.
 * A stable mock user is injected into every request so all auth-gated routes
 * work out-of-the-box without any Replit account or REPL_ID.
 */

import { db, usersTable } from "@workspace/db";
import { logger } from "./logger.js";

export const DEV_USER_ID = process.env.LOCAL_DEV_USER_ID ?? "local-dev-user";

export const DEV_USER = {
  id: DEV_USER_ID,
  name: "Local Dev",
  username: "localdev",
  email: "dev@local.dev",
  firstName: "Local",
  lastName: "Dev",
  profileImageUrl: null as string | null,
};

export function isLocalDev(): boolean {
  return process.env.LOCAL_DEV === "true";
}

let _initialized = false;

/**
 * Upserts the mock dev user into the database on first call.
 * Safe to call multiple times — only runs once.
 */
export async function initDevUser(): Promise<void> {
  if (!isLocalDev() || _initialized) return;
  _initialized = true;

  try {
    await db
      .insert(usersTable)
      .values({
        id: DEV_USER_ID,
        email: "dev@local.dev",
        firstName: "Local",
        lastName: "Dev",
        profileImageUrl: null,
      })
      .onConflictDoNothing();

    logger.info(
      { userId: DEV_USER_ID },
      "LOCAL_DEV: mock user ready — Replit Auth bypassed",
    );
  } catch (err) {
    logger.warn({ err }, "LOCAL_DEV: could not upsert dev user (non-fatal)");
  }
}
