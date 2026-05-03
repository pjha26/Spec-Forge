import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2, Zap, CheckCircle2, XCircle, RefreshCw, ChevronDown, ChevronUp, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Conflict {
  id: number;
  teamId: number;
  spec1Id: number;
  spec2Id: number;
  conflictType: string;
  title: string;
  description: string;
  spec1Excerpt: string | null;
  spec2Excerpt: string | null;
  suggestion: string | null;
  severity: "high" | "medium" | "low";
  status: "open" | "resolved" | "dismissed";
  resolvedAt: string | null;
  createdAt: string;
}

const SEV_COLOR: Record<string, string> = { high: "#EF4444", medium: "#F59E0B", low: "#10B981" };
const SEV_BG: Record<string, string> = {
  high: "rgba(239,68,68,0.08)",
  medium: "rgba(245,158,11,0.08)",
  low: "rgba(16,185,129,0.08)",
};
const TYPE_LABEL: Record<string, string> = {
  data_model: "Data Model",
  api_contract: "API Contract",
  auth: "Auth",
  naming: "Naming",
  responsibility: "Responsibility",
  other: "Other",
};

function ConflictCard({
  conflict, onUpdateStatus,
}: {
  conflict: Conflict;
  onUpdateStatus: (id: number, status: "resolved" | "dismissed") => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const color = SEV_COLOR[conflict.severity];
  const bg = SEV_BG[conflict.severity];

  const update = async (status: "resolved" | "dismissed") => {
    setUpdating(true);
    await onUpdateStatus(conflict.id, status);
    setUpdating(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="rounded-lg overflow-hidden"
      style={{ background: bg, border: `1px solid ${color}25` }}
    >
      <button
        className="w-full flex items-start gap-3 p-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold">{conflict.title}</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0"
              style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
            >
              {TYPE_LABEL[conflict.conflictType] ?? conflict.conflictType}
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0"
              style={{ background: `${color}15`, color, border: `1px solid ${color}20` }}
            >
              {conflict.severity}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{conflict.description}</p>
        </div>
        <div className="shrink-0 text-muted-foreground mt-0.5">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          >
            <div className="px-3 pb-3 space-y-2.5 border-t" style={{ borderColor: `${color}20` }}>
              {(conflict.spec1Excerpt || conflict.spec2Excerpt) && (
                <div className="grid grid-cols-1 gap-2 mt-2.5">
                  {conflict.spec1Excerpt && (
                    <div>
                      <p className="text-[9px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">Spec A says</p>
                      <pre className="text-[10px] p-2 rounded font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed"
                        style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}
                      >{conflict.spec1Excerpt}</pre>
                    </div>
                  )}
                  {conflict.spec2Excerpt && (
                    <div>
                      <p className="text-[9px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">Spec B says</p>
                      <pre className="text-[10px] p-2 rounded font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed"
                        style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}
                      >{conflict.spec2Excerpt}</pre>
                    </div>
                  )}
                </div>
              )}
              {conflict.suggestion && (
                <div className="p-2 rounded text-[11px]"
                  style={{ background: "rgba(var(--primary-rgb),0.06)", border: "1px solid rgba(var(--primary-rgb),0.18)" }}
                >
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--primary))" }}>Suggestion</span>
                  <span className="text-muted-foreground">{conflict.suggestion}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <a href={`/app/specs/${conflict.spec1Id}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-cyan-400 transition-colors"
                >
                  <LinkIcon className="w-2.5 h-2.5" /> Spec #{conflict.spec1Id}
                </a>
                <span className="text-muted-foreground">·</span>
                <a href={`/app/specs/${conflict.spec2Id}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-cyan-400 transition-colors"
                >
                  <LinkIcon className="w-2.5 h-2.5" /> Spec #{conflict.spec2Id}
                </a>
                <div className="flex-1" />
                {conflict.status === "open" && (
                  <>
                    <button
                      onClick={() => update("resolved")}
                      disabled={updating}
                      className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded hover:bg-green-500/10 text-green-400 transition-colors"
                    >
                      {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      Resolved
                    </button>
                    <button
                      onClick={() => update("dismissed")}
                      disabled={updating}
                      className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded hover:bg-red-500/10 text-red-400 transition-colors"
                    >
                      <XCircle className="w-3 h-3" /> Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function SpecConflictsPanel({ teamId }: { teamId: number }) {
  const { toast } = useToast();
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [filter, setFilter] = useState<"open" | "resolved" | "dismissed" | "all">("open");

  const loadConflicts = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}/conflicts`);
      if (res.ok) {
        const data = await res.json();
        setConflicts(data.conflicts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { loadConflicts(); }, [loadConflicts]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/conflicts/analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "AI analysis started", description: `Comparing ${data.specCount ?? "your"} specs. Results appear below in ~30s.` });
      // Poll for results
      setTimeout(loadConflicts, 15000);
      setTimeout(loadConflicts, 30000);
      setTimeout(() => { loadConflicts(); setAnalyzing(false); }, 60000);
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
      setAnalyzing(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: "resolved" | "dismissed") => {
    await fetch(`/api/teams/${teamId}/conflicts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setConflicts(prev => prev.map(c => c.id === id ? { ...c, status, resolvedAt: new Date().toISOString() } : c));
  };

  const filtered = conflicts.filter(c => filter === "all" ? true : c.status === filter);
  const openCount = conflicts.filter(c => c.status === "open").length;
  const highCount = conflicts.filter(c => c.status === "open" && c.severity === "high").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          <h3 className="text-sm font-semibold">Spec Conflict Detector</h3>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.25)" }}
          >AI</span>
          {openCount > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold"
              style={{ background: highCount > 0 ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)", color: highCount > 0 ? "#f87171" : "#fbbf24" }}
            >
              {openCount} open{highCount > 0 ? ` · ${highCount} high` : ""}
            </span>
          )}
        </div>
        <Button onClick={handleAnalyze} disabled={analyzing} size="sm" variant="outline"
          className="font-mono text-xs border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
        >
          {analyzing ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Analyzing…</> : <><Zap className="w-3 h-3 mr-1.5" />Run Analysis</>}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        AI compares all team specs pairwise to find data model conflicts, API mismatches, and integration risks.
      </p>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {(["open", "all", "resolved", "dismissed"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="flex-1 py-1 text-[11px] font-mono rounded-md transition-all capitalize"
            style={filter === f ? {
              background: "rgba(var(--primary-rgb),0.15)", color: "hsl(var(--primary))", border: "1px solid rgba(var(--primary-rgb),0.28)"
            } : { color: "hsl(var(--muted-foreground))", border: "1px solid transparent" }}
          >{f}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading conflicts…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-500/40" />
          <p className="text-sm font-semibold text-muted-foreground">
            {conflicts.length === 0 ? "No analysis run yet" : `No ${filter === "all" ? "" : filter} conflicts`}
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">
            {conflicts.length === 0
              ? "Click \"Run Analysis\" to check all team specs for conflicts and inconsistencies."
              : "All conflicts in this category have been addressed."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map(c => (
              <ConflictCard key={c.id} conflict={c} onUpdateStatus={handleUpdateStatus} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
