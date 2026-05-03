import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare, CheckCircle2, AlertTriangle, AlertCircle,
  Plus, Loader2, Trash2, ChevronDown, ChevronUp, Sparkles,
  Github, GitCommit,
} from "lucide-react";

interface Annotation {
  id: number;
  specId: number;
  userId: string;
  username: string;
  selectedText: string;
  sectionTitle: string;
  status: "verified" | "outdated" | "missing";
  comment: string;
  createdAt: string;
  updatedAt: string;
}

interface AuditDiscrepancy {
  section: string;
  issue: string;
  severity: "high" | "medium" | "low";
  suggestion: string;
}

interface AuditRun {
  id: number;
  status: "pending" | "running" | "completed" | "failed";
  summary: string | null;
  discrepancies: AuditDiscrepancy[] | null;
  createdAt: string;
  completedAt: string | null;
}

interface Props {
  specId: number;
  specStatus: string;
  isGitHub: boolean;
  teamRole: string | null;
  currentUserId: string;
}

const STATUS_META = {
  verified:  { label: "Verified",  Icon: CheckCircle2,  color: "#22C55E", bg: "rgba(34,197,94,0.1)",   border: "rgba(34,197,94,0.2)"   },
  outdated:  { label: "Outdated",  Icon: AlertTriangle, color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.2)"  },
  missing:   { label: "Missing",   Icon: AlertCircle,   color: "#EF4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.2)"   },
};

const SEV_COLOR = { high: "#EF4444", medium: "#F59E0B", low: "#6B7280" };

export function SpecAnnotationPanel({ specId, specStatus, isGitHub, teamRole, currentUserId }: Props) {
  const { toast } = useToast();

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showAdd, setShowAdd]         = useState(false);
  const [expanded, setExpanded]       = useState(true);

  const [form, setForm] = useState({ sectionTitle: "", selectedText: "", status: "outdated" as Annotation["status"], comment: "" });
  const [saving, setSaving]           = useState(false);

  const [audit, setAudit]             = useState<AuditRun | null>(null);
  const [auditing, setAuditing]       = useState(false);
  const [auditExpanded, setAuditExpanded] = useState(false);

  const [committing, setCommitting]   = useState(false);

  const canAnnotate = teamRole !== null && teamRole !== "viewer";
  const isOwner     = teamRole === "owner";

  const fetchAnnotations = useCallback(async () => {
    const r = await fetch(`/api/specs/${specId}/annotations`);
    if (r.ok) setAnnotations(await r.json());
    setLoading(false);
  }, [specId]);

  const fetchLatestAudit = useCallback(async () => {
    const r = await fetch(`/api/specs/${specId}/audit/latest`);
    if (r.ok) setAudit(await r.json());
  }, [specId]);

  useEffect(() => {
    fetchAnnotations();
    fetchLatestAudit();
  }, [fetchAnnotations, fetchLatestAudit]);

  // Poll while audit is running
  useEffect(() => {
    if (!audit || audit.status !== "running") return;
    const iv = setInterval(async () => {
      const r = await fetch(`/api/specs/${specId}/audit/latest`);
      if (r.ok) {
        const updated: AuditRun = await r.json();
        setAudit(updated);
        if (updated.status !== "running") { clearInterval(iv); setAuditing(false); }
      }
    }, 3000);
    return () => clearInterval(iv);
  }, [audit?.status, specId]);

  async function handleSaveAnnotation(e: React.FormEvent) {
    e.preventDefault();
    if (!form.comment.trim() && !form.selectedText.trim()) return;
    setSaving(true);
    const r = await fetch(`/api/specs/${specId}/annotations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      const ann: Annotation = await r.json();
      setAnnotations(prev => [ann, ...prev]);
      setForm({ sectionTitle: "", selectedText: "", status: "outdated", comment: "" });
      setShowAdd(false);
      toast({ title: "Annotation added" });
    } else {
      const err = await r.json() as { error?: string };
      toast({ title: err.error ?? "Failed to save annotation", variant: "destructive" });
    }
    setSaving(false);
  }

  async function handleDelete(id: number) {
    const r = await fetch(`/api/specs/${specId}/annotations/${id}`, { method: "DELETE" });
    if (r.ok) {
      setAnnotations(prev => prev.filter(a => a.id !== id));
      toast({ title: "Annotation removed" });
    } else {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  }

  async function handleRunAudit() {
    setAuditing(true);
    const r = await fetch(`/api/specs/${specId}/audit`, { method: "POST" });
    if (r.ok) {
      setAudit({ id: 0, status: "running", summary: null, discrepancies: null, createdAt: new Date().toISOString(), completedAt: null });
      setAuditExpanded(true);
      toast({ title: "Audit started", description: "Claude is reviewing your spec…" });
    } else {
      setAuditing(false);
      toast({ title: "Failed to start audit", variant: "destructive" });
    }
  }

  async function handleCommit() {
    if (!confirm("Commit current spec content to the repo as SPEC.md?")) return;
    setCommitting(true);
    const r = await fetch(`/api/specs/${specId}/commit-to-github`, { method: "POST" });
    const data = await r.json() as { success?: boolean; commitUrl?: string; error?: string };
    if (r.ok && data.commitUrl) {
      toast({ title: "Committed to GitHub!", description: `SPEC.md pushed — ${data.commitUrl}` });
    } else {
      toast({ title: data.error ?? "Commit failed", variant: "destructive" });
    }
    setCommitting(false);
  }

  const counts = { verified: 0, outdated: 0, missing: 0 };
  annotations.forEach(a => counts[a.status]++);

  const isCompleted = specStatus === "completed";

  return (
    <Card className="border-border bg-card overflow-hidden">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none"
        style={{ borderBottom: expanded ? "1px solid rgba(255,255,255,0.06)" : "none" }}
        onClick={() => setExpanded(v => !v)}
      >
        <MessageSquare className="w-3.5 h-3.5 shrink-0" style={{ color: "#22d3ee" }} />
        <h3 className="text-xs font-mono font-bold text-foreground flex-1">Annotations</h3>

        <div className="flex items-center gap-1.5 mr-1">
          {(["verified", "outdated", "missing"] as const).map(s => counts[s] > 0 && (
            <span key={s} className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{ background: STATUS_META[s].bg, color: STATUS_META[s].color, border: `1px solid ${STATUS_META[s].border}` }}>
              {counts[s]}
            </span>
          ))}
        </div>

        {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
      </div>

      {expanded && (
        <div className="p-3 space-y-3">
          {/* ── AI Audit ──────────────────────────────────────────────────── */}
          {isCompleted && canAnnotate && (
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(0,180,216,0.18)" }}>
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                style={{ background: "rgba(0,180,216,0.06)" }}
                onClick={() => setAuditExpanded(v => !v)}
              >
                <Sparkles className="w-3 h-3 shrink-0" style={{ color: "#22d3ee" }} />
                <span className="text-[10px] font-mono font-bold flex-1" style={{ color: "#22d3ee" }}>AI AUDIT</span>
                {audit?.status === "running" && <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#22d3ee" }} />}
                {audit?.status === "completed" && (
                  <span className="text-[9px] font-mono opacity-60">
                    {audit.discrepancies?.length ?? 0} issues found
                  </span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); handleRunAudit(); }}
                  disabled={auditing || audit?.status === "running"}
                  className="ml-2 text-[9px] font-mono font-bold px-2 py-0.5 rounded disabled:opacity-50 transition-colors"
                  style={{ background: "rgba(0,180,216,0.15)", color: "#22d3ee" }}
                >
                  {auditing || audit?.status === "running" ? "Running…" : "Run"}
                </button>
                {auditExpanded ? <ChevronUp className="w-3 h-3 ml-1 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 ml-1 text-muted-foreground" />}
              </div>

              {auditExpanded && audit && (
                <div className="px-3 pb-3 pt-2 space-y-2">
                  {audit.status === "running" && (
                    <p className="text-[10px] text-muted-foreground font-mono animate-pulse">Claude is reviewing the spec against your codebase…</p>
                  )}
                  {audit.status === "failed" && (
                    <p className="text-[10px] text-red-400 font-mono">Audit failed. Try again.</p>
                  )}
                  {audit.status === "completed" && (
                    <div className="space-y-2">
                      {audit.summary && (
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{audit.summary}</p>
                      )}
                      {(audit.discrepancies ?? []).length === 0 && (
                        <p className="text-[10px] text-green-400 font-mono">No discrepancies found.</p>
                      )}
                      {(audit.discrepancies ?? []).map((d, i) => (
                        <div key={i} className="rounded p-2 space-y-1"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded"
                              style={{ background: `${SEV_COLOR[d.severity]}20`, color: SEV_COLOR[d.severity] }}>
                              {d.severity.toUpperCase()}
                            </span>
                            <span className="text-[10px] font-mono font-semibold truncate">{d.section}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">{d.issue}</p>
                          <p className="text-[9px] opacity-60 leading-relaxed italic">{d.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── GitHub commit-back ────────────────────────────────────────── */}
          {isGitHub && isOwner && isCompleted && (
            <button
              onClick={handleCommit}
              disabled={committing}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[10px] font-mono font-bold transition-colors disabled:opacity-50"
              style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22C55E" }}
            >
              {committing
                ? <><Loader2 className="w-3 h-3 animate-spin" />Committing…</>
                : <><GitCommit className="w-3 h-3" /><Github className="w-3 h-3" />Commit SPEC.md to Repo</>}
            </button>
          )}

          {/* ── Add annotation ────────────────────────────────────────────── */}
          {canAnnotate && isCompleted && (
            <button
              onClick={() => setShowAdd(v => !v)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-colors"
              style={{ background: "rgba(0,180,216,0.08)", border: "1px solid rgba(0,180,216,0.18)", color: "hsl(191,100%,65%)" }}
            >
              <Plus className="w-3 h-3" />
              Add Annotation
            </button>
          )}

          {showAdd && (
            <form onSubmit={handleSaveAnnotation} className="space-y-2 p-3 rounded-lg"
              style={{ background: "rgba(0,180,216,0.04)", border: "1px solid rgba(0,180,216,0.15)" }}>

              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as Annotation["status"] }))}
                className="w-full rounded px-2 py-1.5 text-[10px] font-mono bg-black/40 border border-border outline-none"
              >
                <option value="verified">✓ Verified — matches codebase</option>
                <option value="outdated">⚠ Outdated — no longer accurate</option>
                <option value="missing">✗ Missing — not in spec</option>
              </select>

              <input
                value={form.sectionTitle}
                onChange={e => setForm(f => ({ ...f, sectionTitle: e.target.value }))}
                placeholder="Section title (optional)"
                className="w-full rounded px-2 py-1.5 text-[10px] font-mono bg-black/40 border border-border outline-none focus:border-cyan-500/50"
              />

              <textarea
                value={form.selectedText}
                onChange={e => setForm(f => ({ ...f, selectedText: e.target.value }))}
                placeholder="Relevant text from spec (optional)"
                rows={2}
                className="w-full rounded px-2 py-1.5 text-[10px] font-mono bg-black/40 border border-border outline-none focus:border-cyan-500/50 resize-none"
              />

              <textarea
                value={form.comment}
                onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                placeholder="Describe the issue or note *"
                rows={2}
                required
                className="w-full rounded px-2 py-1.5 text-[10px] font-mono bg-black/40 border border-border outline-none focus:border-cyan-500/50 resize-none"
              />

              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="text-[10px] font-mono text-muted-foreground hover:text-foreground px-2 py-1">
                  Cancel
                </button>
                <button type="submit" disabled={saving || !form.comment.trim()}
                  className="text-[10px] font-mono font-bold px-3 py-1 rounded transition-colors disabled:opacity-50"
                  style={{ background: "rgba(0,180,216,0.2)", color: "hsl(191,100%,65%)" }}>
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                </button>
              </div>
            </form>
          )}

          {/* ── Annotation list ───────────────────────────────────────────── */}
          {loading ? (
            <div className="py-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : annotations.length === 0 ? (
            <p className="text-[10px] text-muted-foreground font-mono opacity-50 text-center py-3">
              No annotations yet.{canAnnotate ? " Add one above." : ""}
            </p>
          ) : (
            <div className="space-y-2">
              {annotations.map(ann => {
                const sm = STATUS_META[ann.status];
                const StatusIcon = sm.Icon;
                const canDelete = ann.userId === currentUserId || isOwner;
                return (
                  <div key={ann.id} className="rounded-lg p-2.5 space-y-1.5 group"
                    style={{ background: sm.bg, border: `1px solid ${sm.border}` }}>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className="w-3 h-3 shrink-0" style={{ color: sm.color }} />
                      <span className="text-[9px] font-mono font-bold flex-1" style={{ color: sm.color }}>
                        {sm.label}{ann.sectionTitle ? ` — ${ann.sectionTitle}` : ""}
                      </span>
                      {canDelete && (
                        <button onClick={() => handleDelete(ann.id)}
                          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-0.5 rounded text-muted-foreground hover:text-red-400 transition-opacity">
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                    {ann.selectedText && (
                      <blockquote className="text-[9px] italic opacity-60 pl-2 leading-relaxed truncate"
                        style={{ borderLeft: `2px solid ${sm.color}40` }}>
                        {ann.selectedText.slice(0, 120)}
                      </blockquote>
                    )}
                    {ann.comment && (
                      <p className="text-[10px] text-foreground leading-relaxed">{ann.comment}</p>
                    )}
                    <p className="text-[9px] text-muted-foreground font-mono opacity-50">
                      {ann.username} · {new Date(ann.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
