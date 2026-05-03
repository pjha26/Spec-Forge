/**
 * Weekly / daily spec health digest emails.
 * Sent per-team to the configured notifyEmail address.
 */

import { db, specsTable, teamsTable, specHealthTable, specConflictsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { sendEmail } from "./email.js";
import { logger } from "./logger.js";

interface SpecSummary {
  id: number;
  title: string;
  specType: string;
  alignmentScore: number | null;
  driftCount: number;
  lastChecked: string | null;
}

function scoreColor(score: number | null): string {
  if (score === null) return "#6B7280";
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  return "#EF4444";
}

function scoreLabel(score: number | null): string {
  if (score === null) return "Not checked";
  if (score >= 80) return "Healthy";
  if (score >= 60) return "Drifting";
  return "Critical";
}

function specTypeLabel(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function buildHtml(opts: {
  teamName: string;
  appUrl: string;
  teamId: number;
  specs: SpecSummary[];
  openConflicts: number;
  highConflicts: number;
  frequency: "weekly" | "daily";
}): string {
  const { teamName, appUrl, teamId, specs, openConflicts, highConflicts, frequency } = opts;

  const avgScore = specs.length > 0
    ? Math.round(specs.filter(s => s.alignmentScore !== null).reduce((a, s) => a + (s.alignmentScore ?? 0), 0) / Math.max(1, specs.filter(s => s.alignmentScore !== null).length))
    : null;

  const teamUrl = `${appUrl}/app/teams/${teamId}`;
  const periodLabel = frequency === "daily" ? "Daily" : "Weekly";

  const specRows = specs.map(s => {
    const color = scoreColor(s.alignmentScore);
    const label = scoreLabel(s.alignmentScore);
    const specUrl = `${appUrl}/app/specs/${s.id}`;
    const driftBadge = s.driftCount > 0
      ? `<span style="background:#ef444420;color:#f87171;border:1px solid #ef444430;border-radius:4px;padding:1px 6px;font-size:11px;">${s.driftCount} drift${s.driftCount !== 1 ? "s" : ""}</span>`
      : `<span style="background:#10b98120;color:#34d399;border:1px solid #10b98130;border-radius:4px;padding:1px 6px;font-size:11px;">Clean</span>`;

    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #1f1f1f;">
          <a href="${specUrl}" style="color:#a78bfa;text-decoration:none;font-size:13px;font-weight:600;">${s.title}</a>
          <div style="color:#6b7280;font-size:11px;margin-top:2px;">${specTypeLabel(s.specType)}</div>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #1f1f1f;text-align:center;">
          <span style="color:${color};font-size:18px;font-weight:700;font-family:monospace;">${s.alignmentScore !== null ? s.alignmentScore + "%" : "—"}</span>
          <div style="color:${color};font-size:10px;">${label}</div>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #1f1f1f;text-align:center;">${driftBadge}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #1f1f1f;text-align:right;">
          <a href="${specUrl}" style="color:#7c3aed;font-size:11px;text-decoration:none;background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);border-radius:4px;padding:3px 8px;">View →</a>
        </td>
      </tr>`;
  }).join("");

  const conflictBadge = openConflicts > 0
    ? `<div style="background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);border-radius:8px;padding:12px 16px;margin-bottom:20px;">
        <span style="color:#f87171;font-size:13px;font-weight:600;">⚠ ${openConflicts} open conflict${openConflicts !== 1 ? "s" : ""}${highConflicts > 0 ? ` · ${highConflicts} high severity` : ""}</span>
        <a href="${teamUrl}?tab=conflicts" style="display:block;color:#f87171;font-size:11px;margin-top:4px;text-decoration:underline;">Review conflicts →</a>
      </div>`
    : `<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:8px;padding:12px 16px;margin-bottom:20px;">
        <span style="color:#34d399;font-size:13px;font-weight:600;">✓ No open conflicts detected across team specs</span>
      </div>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.25);border-radius:12px;padding:8px 16px;margin-bottom:12px;">
        <span style="font-size:14px;font-weight:700;color:#a78bfa;letter-spacing:-0.3px;">⚡ SpecForge</span>
      </div>
      <h1 style="color:#f4f4f5;font-size:20px;font-weight:700;margin:0 0 4px;">${periodLabel} Spec Health Digest</h1>
      <p style="color:#6b7280;font-size:13px;margin:0;">${teamName}</p>
    </div>

    <!-- Score overview -->
    ${avgScore !== null ? `
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
      <div style="color:${scoreColor(avgScore)};font-size:48px;font-weight:700;font-family:monospace;line-height:1;">${avgScore}%</div>
      <div style="color:${scoreColor(avgScore)};font-size:13px;margin-top:4px;">Average Spec Alignment · ${specs.filter(s => s.alignmentScore !== null).length} spec${specs.length !== 1 ? "s" : ""} checked</div>
    </div>` : ""}

    <!-- Conflicts summary -->
    ${conflictBadge}

    <!-- Specs table -->
    ${specs.length > 0 ? `
    <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden;margin-bottom:20px;">
      <div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.07);">
        <span style="color:#9ca3af;font-size:11px;font-family:monospace;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Team Specs</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:rgba(255,255,255,0.02);">
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:10px;font-family:monospace;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #1f1f1f;">Spec</th>
            <th style="padding:8px 12px;text-align:center;color:#6b7280;font-size:10px;font-family:monospace;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #1f1f1f;">Score</th>
            <th style="padding:8px 12px;text-align:center;color:#6b7280;font-size:10px;font-family:monospace;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #1f1f1f;">Drift</th>
            <th style="padding:8px 12px;text-align:right;border-bottom:1px solid #1f1f1f;"></th>
          </tr>
        </thead>
        <tbody>${specRows}</tbody>
      </table>
    </div>` : ""}

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${teamUrl}" style="display:inline-block;background:linear-gradient(135deg,rgba(124,58,237,0.9),rgba(99,102,241,0.9));color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:13px;font-weight:600;">
        Open Team Dashboard →
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
      <p style="color:#4b5563;font-size:11px;margin:0 0 6px;">You're receiving this because you enabled spec health digests for <strong style="color:#6b7280;">${teamName}</strong>.</p>
      <p style="color:#4b5563;font-size:11px;margin:0;">
        <a href="${teamUrl}?tab=settings" style="color:#7c3aed;text-decoration:none;">Change digest settings</a>
        &nbsp;·&nbsp;
        <a href="${appUrl}" style="color:#7c3aed;text-decoration:none;">SpecForge</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildPlainText(opts: {
  teamName: string;
  appUrl: string;
  teamId: number;
  specs: SpecSummary[];
  openConflicts: number;
  highConflicts: number;
}): string {
  const { teamName, appUrl, teamId, specs, openConflicts, highConflicts } = opts;
  const lines: string[] = [
    `SpecForge — Spec Health Digest`,
    `Team: ${teamName}`,
    ``,
    openConflicts > 0
      ? `⚠ ${openConflicts} open conflict${openConflicts !== 1 ? "s" : ""}${highConflicts > 0 ? ` (${highConflicts} high severity)` : ""}`
      : `✓ No open conflicts`,
    ``,
    `SPEC HEALTH`,
    ...specs.map(s => `  ${s.title} — ${s.alignmentScore !== null ? s.alignmentScore + "% aligned" : "Not checked"} | ${s.driftCount} drift items | ${appUrl}/app/specs/${s.id}`),
    ``,
    `Open dashboard: ${appUrl}/app/teams/${teamId}`,
    `Change settings: ${appUrl}/app/teams/${teamId}?tab=settings`,
  ];
  return lines.join("\n");
}

export async function sendTeamDigest(team: {
  id: number;
  name: string;
  notifyEmail: string;
  digestFrequency: "weekly" | "daily";
}): Promise<boolean> {
  const appUrl = process.env["APP_URL"] ?? "https://specforge.replit.app";

  const specs = await db
    .select({ id: specsTable.id, title: specsTable.title, specType: specsTable.specType })
    .from(specsTable)
    .where(and(eq(specsTable.teamId, team.id), eq(specsTable.status, "completed")));

  const specSummaries: SpecSummary[] = await Promise.all(
    specs.map(async s => {
      const [report] = await db
        .select({ alignmentScore: specHealthTable.alignmentScore, driftItems: specHealthTable.driftItems, createdAt: specHealthTable.createdAt })
        .from(specHealthTable)
        .where(eq(specHealthTable.specId, s.id))
        .orderBy(desc(specHealthTable.createdAt))
        .limit(1);
      return {
        id: s.id,
        title: s.title,
        specType: s.specType,
        alignmentScore: report?.alignmentScore ?? null,
        driftCount: Array.isArray(report?.driftItems) ? (report.driftItems as any[]).length : 0,
        lastChecked: report?.createdAt?.toISOString() ?? null,
      };
    })
  );

  const conflicts = await db
    .select({ id: specConflictsTable.id, severity: specConflictsTable.severity })
    .from(specConflictsTable)
    .where(and(eq(specConflictsTable.teamId, team.id), eq(specConflictsTable.status, "open")));

  const openConflicts = conflicts.length;
  const highConflicts = conflicts.filter(c => c.severity === "high").length;

  const periodLabel = team.digestFrequency === "daily" ? "Daily" : "Weekly";
  const subject = `${periodLabel} Spec Health: ${team.name} — ${specSummaries.filter(s => s.alignmentScore !== null).length} specs checked${openConflicts > 0 ? ` · ${openConflicts} conflict${openConflicts !== 1 ? "s" : ""}` : ""}`;

  const html = buildHtml({ teamName: team.name, appUrl, teamId: team.id, specs: specSummaries, openConflicts, highConflicts, frequency: team.digestFrequency });
  const text = buildPlainText({ teamName: team.name, appUrl, teamId: team.id, specs: specSummaries, openConflicts, highConflicts });

  logger.info({ teamId: team.id, to: team.notifyEmail }, "Sending spec health digest");
  return sendEmail({ to: team.notifyEmail, subject, html, text });
}

export async function sendAllDigests(frequency: "weekly" | "daily"): Promise<void> {
  const teams = await db
    .select({ id: teamsTable.id, name: teamsTable.name, notifyEmail: teamsTable.notifyEmail, digestFrequency: teamsTable.digestFrequency })
    .from(teamsTable)
    .where(eq(teamsTable.digestFrequency, frequency));

  const eligible = teams.filter(t => t.notifyEmail && t.digestFrequency === frequency) as Array<{
    id: number; name: string; notifyEmail: string; digestFrequency: "weekly" | "daily";
  }>;

  logger.info({ count: eligible.length, frequency }, "Sending spec health digests");

  for (const team of eligible) {
    try {
      await sendTeamDigest(team);
    } catch (err) {
      logger.error({ err, teamId: team.id }, "Failed to send digest");
    }
    await new Promise(r => setTimeout(r, 1500));
  }
}
