import { Router, type Request, type Response } from "express";
import { db, teamsTable, teamMembersTable, specsTable } from "@workspace/db";
import { eq, and, or, inArray } from "drizzle-orm";
import type { AuthedRequest } from "../middlewares/authMiddleware.js";

const router = Router();

function requireUser(req: Request, res: Response): req is Request & AuthedRequest {
  const ar = req as AuthedRequest;
  if (!ar.user) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
}

async function getTeamWithAccess(teamId: number, userId: string) {
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (!team) return null;
  const [membership] = await db
    .select()
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, userId)));
  if (!membership) return null;
  return { team, role: membership.role };
}

// List teams for current user
router.get("/", async (req: Request, res: Response) => {
  if (!requireUser(req, res)) return;
  const userId = (req as AuthedRequest).user!.id;
  const memberships = await db
    .select()
    .from(teamMembersTable)
    .where(eq(teamMembersTable.userId, userId));
  if (memberships.length === 0) {
    res.json({ teams: [] });
    return;
  }
  const teamIds = memberships.map(m => m.teamId);
  const teams = await db.select().from(teamsTable).where(inArray(teamsTable.id, teamIds));
  const result = teams.map(t => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    role: memberships.find(m => m.teamId === t.id)?.role ?? "viewer",
  }));
  res.json({ teams: result });
});

// Create team
router.post("/", async (req: Request, res: Response) => {
  if (!requireUser(req, res)) return;
  const user = (req as AuthedRequest).user!;
  const { name, description } = req.body as { name?: string; description?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "Team name is required" });
    return;
  }
  const [team] = await db
    .insert(teamsTable)
    .values({ name: name.trim(), description: description?.trim() ?? "", ownerId: user.id })
    .returning();
  // Add owner as member
  await db.insert(teamMembersTable).values({
    teamId: team.id,
    userId: user.id,
    username: user.username ?? user.name ?? user.id,
    role: "owner",
  });
  res.status(201).json({
    ...team,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
    role: "owner",
  });
});

// Get team by id (with members + specs)
router.get("/:id", async (req: Request, res: Response) => {
  if (!requireUser(req, res)) return;
  const userId = (req as AuthedRequest).user!.id;
  const teamId = Number(req.params.id);
  if (isNaN(teamId)) { res.status(400).json({ error: "Invalid team id" }); return; }

  const access = await getTeamWithAccess(teamId, userId);
  if (!access) { res.status(404).json({ error: "Team not found" }); return; }

  const members = await db.select().from(teamMembersTable).where(eq(teamMembersTable.teamId, teamId));
  const specs = await db.select({
    id: specsTable.id,
    title: specsTable.title,
    specType: specsTable.specType,
    status: specsTable.status,
    createdAt: specsTable.createdAt,
    complexityScore: specsTable.complexityScore,
  }).from(specsTable).where(eq(specsTable.teamId, teamId));

  res.json({
    ...access.team,
    createdAt: access.team.createdAt.toISOString(),
    updatedAt: access.team.updatedAt.toISOString(),
    role: access.role,
    members: members.map(m => ({ ...m, joinedAt: m.joinedAt.toISOString() })),
    specs: specs.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })),
  });
});

// Update team name/description
router.put("/:id", async (req: Request, res: Response) => {
  if (!requireUser(req, res)) return;
  const userId = (req as AuthedRequest).user!.id;
  const teamId = Number(req.params.id);
  if (isNaN(teamId)) { res.status(400).json({ error: "Invalid team id" }); return; }

  const access = await getTeamWithAccess(teamId, userId);
  if (!access) { res.status(404).json({ error: "Team not found" }); return; }
  if (access.role !== "owner") { res.status(403).json({ error: "Only owners can update team settings" }); return; }

  const { name, description, customSystemPrompt } = req.body as { name?: string; description?: string; customSystemPrompt?: string };
  const [updated] = await db
    .update(teamsTable)
    .set({
      ...(name?.trim() ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description: description.trim() } : {}),
      ...(customSystemPrompt !== undefined ? { customSystemPrompt: customSystemPrompt.trim() || null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(teamsTable.id, teamId))
    .returning();
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

// Delete team
router.delete("/:id", async (req: Request, res: Response) => {
  if (!requireUser(req, res)) return;
  const userId = (req as AuthedRequest).user!.id;
  const teamId = Number(req.params.id);
  if (isNaN(teamId)) { res.status(400).json({ error: "Invalid team id" }); return; }

  const access = await getTeamWithAccess(teamId, userId);
  if (!access) { res.status(404).json({ error: "Team not found" }); return; }
  if (access.role !== "owner") { res.status(403).json({ error: "Only owners can delete the team" }); return; }

  await db.update(specsTable).set({ teamId: null }).where(eq(specsTable.teamId, teamId));
  await db.delete(teamMembersTable).where(eq(teamMembersTable.teamId, teamId));
  await db.delete(teamsTable).where(eq(teamsTable.id, teamId));
  res.json({ success: true });
});

// Add member
router.post("/:id/members", async (req: Request, res: Response) => {
  if (!requireUser(req, res)) return;
  const userId = (req as AuthedRequest).user!.id;
  const teamId = Number(req.params.id);
  if (isNaN(teamId)) { res.status(400).json({ error: "Invalid team id" }); return; }

  const access = await getTeamWithAccess(teamId, userId);
  if (!access) { res.status(404).json({ error: "Team not found" }); return; }
  if (access.role === "viewer") { res.status(403).json({ error: "Viewers cannot add members" }); return; }

  const { userId: newUserId, username, role } = req.body as { userId?: string; username?: string; role?: string };
  if (!newUserId?.trim()) { res.status(400).json({ error: "userId is required" }); return; }
  const validRole = (["editor", "viewer"] as const).includes(role as "editor" | "viewer") ? role as "editor" | "viewer" : "viewer";

  const [existing] = await db
    .select()
    .from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, newUserId.trim())));
  if (existing) { res.status(409).json({ error: "User is already a member" }); return; }

  const [member] = await db
    .insert(teamMembersTable)
    .values({ teamId, userId: newUserId.trim(), username: username?.trim() ?? newUserId.trim(), role: validRole })
    .returning();
  res.status(201).json({ ...member, joinedAt: member.joinedAt.toISOString() });
});

// Remove member
router.delete("/:id/members/:memberId", async (req: Request, res: Response) => {
  if (!requireUser(req, res)) return;
  const userId = (req as AuthedRequest).user!.id;
  const teamId = Number(req.params.id);
  const memberId = Number(req.params.memberId);
  if (isNaN(teamId) || isNaN(memberId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const access = await getTeamWithAccess(teamId, userId);
  if (!access) { res.status(404).json({ error: "Team not found" }); return; }

  const [memberToRemove] = await db.select().from(teamMembersTable).where(eq(teamMembersTable.id, memberId));
  if (!memberToRemove || memberToRemove.teamId !== teamId) { res.status(404).json({ error: "Member not found" }); return; }
  if (memberToRemove.role === "owner") { res.status(400).json({ error: "Cannot remove the team owner" }); return; }
  if (access.role === "viewer" && memberToRemove.userId !== userId) {
    res.status(403).json({ error: "Insufficient permissions" }); return;
  }

  await db.delete(teamMembersTable).where(eq(teamMembersTable.id, memberId));
  res.json({ success: true });
});

// Update member role
router.put("/:id/members/:memberId", async (req: Request, res: Response) => {
  if (!requireUser(req, res)) return;
  const userId = (req as AuthedRequest).user!.id;
  const teamId = Number(req.params.id);
  const memberId = Number(req.params.memberId);
  if (isNaN(teamId) || isNaN(memberId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const access = await getTeamWithAccess(teamId, userId);
  if (!access) { res.status(404).json({ error: "Team not found" }); return; }
  if (access.role !== "owner") { res.status(403).json({ error: "Only owners can change roles" }); return; }

  const { role } = req.body as { role?: string };
  const validRole = (["editor", "viewer"] as const).includes(role as "editor" | "viewer") ? role as "editor" | "viewer" : "viewer";

  const [updated] = await db
    .update(teamMembersTable)
    .set({ role: validRole })
    .where(and(eq(teamMembersTable.id, memberId), eq(teamMembersTable.teamId, teamId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Member not found" }); return; }
  res.json({ ...updated, joinedAt: updated.joinedAt.toISOString() });
});

// Assign spec to team
router.post("/:id/specs/:specId", async (req: Request, res: Response) => {
  if (!requireUser(req, res)) return;
  const userId = (req as AuthedRequest).user!.id;
  const teamId = Number(req.params.id);
  const specId = Number(req.params.specId);
  if (isNaN(teamId) || isNaN(specId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const access = await getTeamWithAccess(teamId, userId);
  if (!access) { res.status(404).json({ error: "Team not found" }); return; }
  if (access.role === "viewer") { res.status(403).json({ error: "Viewers cannot add specs" }); return; }

  await db.update(specsTable).set({ teamId, updatedAt: new Date() }).where(eq(specsTable.id, specId));
  res.json({ success: true });
});

// Remove spec from team
router.delete("/:id/specs/:specId", async (req: Request, res: Response) => {
  if (!requireUser(req, res)) return;
  const userId = (req as AuthedRequest).user!.id;
  const teamId = Number(req.params.id);
  const specId = Number(req.params.specId);
  if (isNaN(teamId) || isNaN(specId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const access = await getTeamWithAccess(teamId, userId);
  if (!access) { res.status(404).json({ error: "Team not found" }); return; }
  if (access.role === "viewer") { res.status(403).json({ error: "Viewers cannot remove specs" }); return; }

  await db.update(specsTable).set({ teamId: null, updatedAt: new Date() }).where(
    and(eq(specsTable.id, specId), eq(specsTable.teamId, teamId))
  );
  res.json({ success: true });
});

export default router;
