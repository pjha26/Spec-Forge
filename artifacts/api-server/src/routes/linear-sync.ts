/**
 * Linear / Jira issue sync
 * POST /api/specs/:id/sync-issues   — AI extracts tasks, creates issues
 * GET  /api/specs/:id/issues         — list synced issues
 */

import { Router, type Request, type Response } from "express";
import { db, specsTable, specIssuesTable, userPreferencesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

interface ExtractedTask {
  section: string;
  title: string;
  description: string;
}

async function extractTasksFromSpec(content: string): Promise<ExtractedTask[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `From the following technical specification, extract all concrete action items, implementation tasks, and development tickets. Group them by spec section. Each task should be specific and actionable.

Output ONLY a JSON array (no markdown, no explanation):
[{"section": "Authentication", "title": "Implement JWT token generation", "description": "Create JWT signing logic with RS256 algorithm and 24h expiry"}]

Spec content:
${content.slice(0, 6000)}`,
      },
    ],
  });

  const raw = (message.content[0] as { text: string }).text.trim();
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];
  return JSON.parse(match[0]);
}

async function createLinearIssue(
  apiKey: string,
  teamId: string,
  title: string,
  description: string,
): Promise<{ id: string; url: string } | null> {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        mutation CreateIssue($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue { id url identifier }
          }
        }`,
      variables: { input: { title, description, teamId } },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json() as any;
  if (!data?.data?.issueCreate?.success) return null;
  const issue = data.data.issueCreate.issue;
  return { id: issue.identifier, url: issue.url };
}

async function createJiraIssue(
  apiKey: string,
  baseUrl: string,
  projectKey: string,
  title: string,
  description: string,
): Promise<{ id: string; url: string } | null> {
  const cleanBase = baseUrl.replace(/\/$/, "");
  const res = await fetch(`${cleanBase}/rest/api/3/issue`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`token:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      fields: {
        summary: title,
        description: {
          type: "doc",
          version: 1,
          content: [{ type: "paragraph", content: [{ type: "text", text: description }] }],
        },
        project: { key: projectKey },
        issuetype: { name: "Task" },
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const data = await res.json() as any;
  return { id: data.key, url: `${cleanBase}/browse/${data.key}` };
}

export async function listLinearTeams(apiKey: string): Promise<{ id: string; name: string }[]> {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ query: "{ teams { nodes { id name } } }" }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json() as any;
  return data?.data?.teams?.nodes ?? [];
}

// GET /api/specs/:id/issues
router.get("/:id/issues", async (req: Request, res: Response) => {
  const specId = Number(req.params.id);
  try {
    const issues = await db.select().from(specIssuesTable).where(eq(specIssuesTable.specId, specId));
    res.json({ issues });
  } catch (err) {
    req.log.error({ err }, "Failed to get issues");
    res.status(500).json({ error: "Failed to get issues" });
  }
});

// POST /api/specs/:id/sync-issues
router.post("/:id/sync-issues", async (req: Request, res: Response) => {
  const specId = Number(req.params.id);
  const userId = (req as any).session?.user?.id as string | undefined;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { platform } = req.body as { platform: "linear" | "jira" };
  if (!platform) { res.status(400).json({ error: "platform required (linear or jira)" }); return; }

  try {
    const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, specId));
    if (!spec?.content) { res.status(404).json({ error: "Spec not found or not yet generated" }); return; }

    const [prefs] = await db.select().from(userPreferencesTable).where(eq(userPreferencesTable.userId, userId));
    if (!prefs) { res.status(400).json({ error: "Integration not configured" }); return; }

    if (platform === "linear") {
      if (!prefs.linearApiKey || !prefs.linearTeamId) {
        res.status(400).json({ error: "Linear API key and team ID required. Configure them in Integrations." });
        return;
      }
    } else {
      if (!prefs.jiraApiKey || !prefs.jiraBaseUrl || !prefs.jiraProjectKey) {
        res.status(400).json({ error: "Jira API key, base URL, and project key required. Configure them in Integrations." });
        return;
      }
    }

    // AI extracts tasks
    const tasks = await extractTasksFromSpec(spec.content);
    if (tasks.length === 0) { res.json({ issues: [], message: "No actionable tasks found in this spec" }); return; }

    // Create issues
    const created: Array<typeof specIssuesTable.$inferInsert> = [];
    for (const task of tasks.slice(0, 25)) {
      let result: { id: string; url: string } | null = null;

      if (platform === "linear") {
        result = await createLinearIssue(prefs.linearApiKey!, prefs.linearTeamId!, task.title, task.description);
      } else {
        result = await createJiraIssue(prefs.jiraApiKey!, prefs.jiraBaseUrl!, prefs.jiraProjectKey!, task.title, task.description);
      }

      if (result) {
        created.push({
          specId,
          sectionTitle: task.section,
          issueTitle: task.title,
          issueId: result.id,
          issueUrl: result.url,
          platform,
          status: "open",
        });
      }
    }

    if (created.length > 0) {
      await db
        .insert(specIssuesTable)
        .values(created)
        .onConflictDoNothing();
    }

    const issues = await db.select().from(specIssuesTable).where(eq(specIssuesTable.specId, specId));
    res.json({ issues, created: created.length });
  } catch (err) {
    req.log.error({ err }, "Issue sync failed");
    res.status(500).json({ error: "Issue sync failed" });
  }
});

// GET /api/integrations/linear/teams
router.get("/linear-teams", async (req: Request, res: Response) => {
  const userId = (req as any).session?.user?.id as string | undefined;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const [prefs] = await db.select().from(userPreferencesTable).where(eq(userPreferencesTable.userId, userId));
    if (!prefs?.linearApiKey) { res.status(400).json({ error: "Linear API key not set" }); return; }
    const teams = await listLinearTeams(prefs.linearApiKey);
    res.json({ teams });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch Linear teams");
    res.status(500).json({ error: "Failed to fetch Linear teams" });
  }
});

export default router;
