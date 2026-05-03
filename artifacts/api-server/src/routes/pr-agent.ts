/**
 * Spec-to-PR Auto-Description Agent
 * POST /api/specs/:id/pr-description
 */

import { Router } from "express";
import { db, specsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateCompletion } from "../lib/model-router.js";

const router = Router();

function parsePrUrl(prUrl: string): { owner: string; repo: string; prNumber: number } | null {
  const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], prNumber: Number(match[3]) };
}

async function fetchPrDiff(owner: string, repo: string, prNumber: number, token?: string): Promise<string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3.diff",
    "User-Agent": "SpecForge/1.0",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
    headers,
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);

  const diffRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
    headers: { ...headers, Accept: "application/vnd.github.v3.diff" },
  });
  const diff = await diffRes.text();
  return diff.slice(0, 12000);
}

async function fetchPrMeta(owner: string, repo: string, prNumber: number, token?: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "SpecForge/1.0",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, { headers });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json() as Promise<{ title: string; body: string; head: { ref: string }; changed_files: number; additions: number; deletions: number }>;
}

router.post("/:id/pr-description", async (req, res) => {
  const specId = Number(req.params.id);
  const { prUrl, githubToken } = req.body as { prUrl?: string; githubToken?: string };

  if (!prUrl || typeof prUrl !== "string") {
    res.status(400).json({ error: "prUrl is required" });
    return;
  }

  const parsed = parsePrUrl(prUrl);
  if (!parsed) {
    res.status(400).json({ error: "Invalid GitHub PR URL. Expected: https://github.com/owner/repo/pull/123" });
    return;
  }

  try {
    const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, specId));
    if (!spec) { res.status(404).json({ error: "Spec not found" }); return; }

    const [diff, meta] = await Promise.all([
      fetchPrDiff(parsed.owner, parsed.repo, parsed.prNumber, githubToken),
      fetchPrMeta(parsed.owner, parsed.repo, parsed.prNumber, githubToken),
    ]);

    const prompt = `You are a senior engineer writing a PR description.

You have:
1. A technical specification document
2. A GitHub PR diff

Your task:
- Write a clear, structured PR description that maps the changes back to the spec
- Identify which spec sections each changed file implements
- Flag any deviations from the spec (implementation that differs from what the spec says)
- Be concise but thorough

Return ONLY valid JSON in this exact format:
{
  "description": "<full markdown PR description with ## sections>",
  "implementedSections": ["<spec section name>", ...],
  "deviations": [
    { "file": "<filename>", "issue": "<what differs from spec>", "severity": "high|medium|low" }
  ],
  "alignmentScore": <integer 0-100>
}

SPEC DOCUMENT:
${spec.content.slice(0, 6000)}

PR TITLE: ${meta.title}
PR BRANCH: ${meta.head.ref}
CHANGED FILES: ${meta.changed_files} (+${meta.additions}/-${meta.deletions})

PR DIFF:
${diff}`;

    const raw = await generateCompletion({
      model: "claude-sonnet-4-6",
      system: "You analyze GitHub PRs against technical specs. Return only valid JSON.",
      userMessage: prompt,
      maxTokens: 4096,
    });

    let result: { description: string; implementedSections: string[]; deviations: any[]; alignmentScore: number };
    try {
      const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
      else throw new Error("Failed to parse AI response");
    }

    res.json({
      prUrl,
      prTitle: meta.title,
      prBranch: meta.head.ref,
      changedFiles: meta.changed_files,
      ...result,
    });
  } catch (err: any) {
    req.log.error({ err }, "PR agent failed");
    res.status(500).json({ error: err.message ?? "PR analysis failed" });
  }
});

export default router;
