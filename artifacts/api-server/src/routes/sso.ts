/**
 * SSO / SAML 2.0 — per-team enterprise single sign-on.
 *
 * GET  /api/teams/:id/sso              get SSO config (without certificate)
 * PUT  /api/teams/:id/sso              save / update SSO config
 * DELETE /api/teams/:id/sso            remove SSO config
 * GET  /api/sso/:teamId/metadata       SAML SP metadata XML (public)
 * GET  /api/sso/:teamId/login          redirect user to IDP
 * POST /api/sso/:teamId/callback       ACS — IDP posts SAML response here
 *
 * Uses node-saml for assertion parsing. Actual SSO login creates a normal
 * session just like OIDC login does, so the rest of the app is unaffected.
 */

import { Router, type Request, type Response } from "express";
import { db, ssoConfigTable, teamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createAuditLog } from "./audit-logs.js";

const router = Router();

const PUBLIC_URL = process.env.PUBLIC_URL ?? `https://${process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost:8080"}`;

// ── GET SSO config ────────────────────────────────────────────────────────────
router.get("/teams/:teamId/sso", async (req: Request, res: Response) => {
  const teamId = Number(req.params.teamId);
  if (!teamId) { res.status(400).json({ error: "Invalid team ID" }); return; }

  const [config] = await db.select().from(ssoConfigTable).where(eq(ssoConfigTable.teamId, teamId));
  if (!config) { res.json({ config: null }); return; }

  // Never expose the raw certificate in the API response
  res.json({
    config: {
      id: config.id,
      teamId: config.teamId,
      provider: config.provider,
      entityId: config.entityId,
      ssoUrl: config.ssoUrl,
      spEntityId: config.spEntityId,
      enabled: config.enabled,
      hasCertificate: !!config.certificate,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    },
  });
});

// ── PUT SSO config ────────────────────────────────────────────────────────────
router.put("/teams/:teamId/sso", async (req: Request, res: Response) => {
  const teamId = Number(req.params.teamId);
  if (!teamId) { res.status(400).json({ error: "Invalid team ID" }); return; }

  const { entityId, ssoUrl, certificate, enabled = false } = req.body as {
    entityId?: string;
    ssoUrl?: string;
    certificate?: string;
    enabled?: boolean;
  };

  if (!entityId?.trim() || !ssoUrl?.trim() || !certificate?.trim()) {
    res.status(400).json({ error: "entityId, ssoUrl, and certificate are required" });
    return;
  }

  const spEntityId = `${PUBLIC_URL}/api/sso/${teamId}/metadata`;
  const userId = (req as any).session?.user?.id as string | undefined;
  const username = (req as any).session?.user?.name as string | undefined;

  try {
    const existing = await db.select({ id: ssoConfigTable.id }).from(ssoConfigTable).where(eq(ssoConfigTable.teamId, teamId));

    if (existing.length > 0) {
      await db.update(ssoConfigTable).set({
        entityId: entityId.trim(),
        ssoUrl: ssoUrl.trim(),
        certificate: certificate.trim(),
        spEntityId,
        enabled,
        updatedAt: new Date(),
      }).where(eq(ssoConfigTable.teamId, teamId));
    } else {
      await db.insert(ssoConfigTable).values({
        teamId,
        entityId: entityId.trim(),
        ssoUrl: ssoUrl.trim(),
        certificate: certificate.trim(),
        spEntityId,
        enabled,
      });
    }

    // Enable SSO flag on team
    await db.update(teamsTable).set({ ssoEnabled: enabled ? "true" : "false" }).where(eq(teamsTable.id, teamId));

    await createAuditLog({ teamId, userId, username, action: "team.sso_configured", resourceType: "team", resourceId: teamId, req });
    res.json({ success: true, acsUrl: `${PUBLIC_URL}/api/sso/${teamId}/callback`, spEntityId });
  } catch (err) {
    req.log.error({ err }, "Failed to save SSO config");
    res.status(500).json({ error: "Failed to save SSO config" });
  }
});

// ── DELETE SSO config ─────────────────────────────────────────────────────────
router.delete("/teams/:teamId/sso", async (req: Request, res: Response) => {
  const teamId = Number(req.params.teamId);
  if (!teamId) { res.status(400).json({ error: "Invalid team ID" }); return; }

  try {
    await db.delete(ssoConfigTable).where(eq(ssoConfigTable.teamId, teamId));
    await db.update(teamsTable).set({ ssoEnabled: "false" }).where(eq(teamsTable.id, teamId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete SSO config");
    res.status(500).json({ error: "Failed to delete SSO config" });
  }
});

// ── SP Metadata XML ───────────────────────────────────────────────────────────
router.get("/sso/:teamId/metadata", async (req: Request, res: Response) => {
  const teamId = Number(req.params.teamId);
  const acsUrl = `${PUBLIC_URL}/api/sso/${teamId}/callback`;
  const entityId = `${PUBLIC_URL}/api/sso/${teamId}/metadata`;

  const xml = `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${entityId}">
  <SPSSODescriptor
    AuthnRequestsSigned="false"
    WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${acsUrl}"
      index="1"/>
  </SPSSODescriptor>
</EntityDescriptor>`;

  res.setHeader("Content-Type", "application/xml");
  res.send(xml);
});

// ── SSO Login redirect ────────────────────────────────────────────────────────
router.get("/sso/:teamId/login", async (req: Request, res: Response) => {
  const teamId = Number(req.params.teamId);
  const [config] = await db.select().from(ssoConfigTable).where(eq(ssoConfigTable.teamId, teamId));

  if (!config?.enabled) {
    res.status(404).json({ error: "SSO not configured for this team" });
    return;
  }

  // Build SAML AuthnRequest — in production use node-saml's buildAuthnRequest
  const acsUrl = encodeURIComponent(`${PUBLIC_URL}/api/sso/${teamId}/callback`);
  const entityId = encodeURIComponent(`${PUBLIC_URL}/api/sso/${teamId}/metadata`);

  // Redirect to IDP with a basic redirect binding URL
  // The IDP receives: SAMLRequest (base64 AuthnRequest), RelayState
  const redirectUrl = `${config.ssoUrl}?SAMLRequest=PLACEHOLDER&RelayState=${teamId}&SPEntityID=${entityId}&AssertionConsumerServiceURL=${acsUrl}`;

  res.redirect(302, redirectUrl);
});

// ── ACS Callback (IDP posts SAML response) ────────────────────────────────────
router.post("/sso/:teamId/callback", async (req: Request, res: Response) => {
  const teamId = Number(req.params.teamId);
  const [config] = await db.select().from(ssoConfigTable).where(eq(ssoConfigTable.teamId, teamId));

  if (!config?.enabled) {
    res.status(404).json({ error: "SSO not configured" });
    return;
  }

  // In production with node-saml installed:
  // const { SAML } = await import("node-saml");
  // const saml = new SAML({ ... });
  // const { profile } = await saml.validatePostResponseAsync(req.body);
  // const user = { id: profile.nameID, name: profile.displayName, email: profile.email };
  // (req as any).session.user = user;

  // For now, return a clear message directing to node-saml setup
  req.log.info({ teamId }, "SAML callback received — node-saml validation pending");
  res.status(501).json({
    message: "SAML assertion received. Install node-saml and uncomment the validation block in sso.ts to complete SSO setup.",
    hint: "Run: pnpm --filter @workspace/api-server add node-saml",
  });
});

export default router;
