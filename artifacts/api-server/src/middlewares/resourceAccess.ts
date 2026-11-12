import { db, specsTable, teamMembersTable } from "@workspace/db";
import { and, eq, inArray, or } from "drizzle-orm";
import type { RequestHandler } from "express";

export function visibleSpecs(userId: string) {
  return or(
    eq(specsTable.userId, userId),
    inArray(specsTable.teamId, db.select({ id: teamMembersTable.teamId })
      .from(teamMembersTable).where(eq(teamMembersTable.userId, userId))),
  );
}

export const requireSpecAccess: RequestHandler = async (req, res, next) => {
  const id = Number(req.params.specId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid spec ID" });
    return;
  }
  const userId = req.user!.id;
  const [spec] = await db.select({ owner: specsTable.userId, team: specsTable.teamId })
    .from(specsTable).where(and(eq(specsTable.id, id), visibleSpecs(userId)));
  if (!spec) { res.status(404).json({ error: "Spec not found" }); return; }
  const ownerOnly = /^\/(?:share|webhook|commit-to-github|export\/notion)(?:\/|$)/i.test(req.path) || req.method === "DELETE" && req.path === "/";
  if (spec.owner === userId || (!ownerOnly && (req.method === "GET" || req.method === "HEAD"))) {
    next();
    return;
  }
  const [member] = spec.team === null ? [] : await db.select({ role: teamMembersTable.role })
    .from(teamMembersTable).where(and(eq(teamMembersTable.teamId, spec.team), eq(teamMembersTable.userId, userId)));
  if (ownerOnly || (member?.role !== "owner" && member?.role !== "editor")) {
    res.status(403).json({ error: "Insufficient spec permissions" });
    return;
  }
  next();
};

export const requireTeamAccess: RequestHandler = async (req, res, next) => {
  const teamId = Number(req.params.teamId);
  if (!Number.isSafeInteger(teamId) || teamId <= 0) {
    res.status(400).json({ error: "Invalid team ID" });
    return;
  }
  const [member] = await db.select({ role: teamMembersTable.role }).from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, req.user!.id)));
  if (!member) { res.status(404).json({ error: "Team not found" }); return; }
  if (req.method !== "GET" && req.method !== "HEAD" && member.role !== "owner" && member.role !== "editor") {
    res.status(403).json({ error: "Insufficient team permissions" });
    return;
  }
  next();
};
