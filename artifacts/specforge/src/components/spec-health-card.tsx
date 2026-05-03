import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Loader2, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface DriftItem {
  type: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  filePath?: string;
  specSection?: string;
}

interface HealthReport {
  id: number;
  specId: number;
  alignmentScore: number;
  driftItems: DriftItem[];
  summary: string;
  triggeredBy: string;
  createdAt: string;
}

const SEV_COLOR: Record<string, string> = { high: "#EF4444", medium: "#F59E0B", low: "#10B981" };
const TYPE_LABEL: Record<string, string> = {
  missing_section: "Missing Section",
  new_file_not_in_spec: "Undocumented File",
  implementation_differs: "Implementation Drift",
  renamed: "Renamed Entity",
};

function scoreGradient(score: number) {
  if (score >= 80) return { from: "#10B981", to: "#34d399", text: "#10B981", label: "Healthy" };
  if (score >= 60) return { from: "#F59E0B", to: "#fbbf24", text: "#F59E0B", label: "Drifting" };
  return { from: "#EF4444", to: "#f87171", text: "#EF4444", label: "Critical" };
}

export function SpecHealthCard({ specId, specStatus }: { specId: number; specStatus: string }) {
  const { toast } = useToast();
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showDrift, setShowDrift] = useState(true);

  useEffect(() => {
    fetch(`/api/specs/${specId}/health`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.report) setReport(d.report); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [specId]);

  const handleAnalyze = async () => {
    if (specStatus !== "completed") {
      toast({ title: "Generate the spec first before running health analysis.", variant: "destructive" });
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/specs/${specId}/health/analyze`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to start");
      toast({ title: "Health analysis started", description: "Results will appear in ~20 seconds." });
      setTimeout(async () => {
        const r = await fetch(`/api/specs/${specId}/health`).then(x => x.json());
        if (r?.report) setReport(r.report);
        setAnalyzing(false);
      }, 25000);
    } catch {
      toast({ title: "Analysis failed", variant: "destructive" });
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl p-4 flex items-center gap-2 text-muted-foreground text-sm"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading health report…
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-xl p-4 space-y-3"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Spec Health</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Run a health analysis to see how well this spec aligns with the codebase.
          Detects drift, undocumented files, and implementation mismatches.
        </p>
        <Button onClick={handleAnalyze} disabled={analyzing} size="sm" variant="outline" className="w-full font-mono text-xs">
          {analyzing ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Analyzing…</> : <><Activity className="w-3 h-3 mr-2" />Run Health Check</>}
        </Button>
      </div>
    );
  }

  const g = scoreGradient(report.alignmentScore);
  const highCount = report.driftItems.filter(d => d.severity === "high").length;

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${g.from}25`, background: `${g.from}06` }}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: g.text }} />
            <span className="text-sm font-semibold">Spec Health</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: `${g.from}20`, color: g.text, border: `1px solid ${g.from}30` }}
            >
              {g.label}
            </span>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Re-run analysis"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Score bar */}
        <div className="space-y-1.5">
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold font-mono" style={{ color: g.text }}>{report.alignmentScore}%</span>
            <span className="text-[10px] font-mono text-muted-foreground">
              alignment · {format(new Date(report.createdAt), "MMM d, h:mm a")}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${g.from}, ${g.to})` }}
              initial={{ width: 0 }}
              animate={{ width: `${report.alignmentScore}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.2 }}
            />
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{report.summary}</p>

        {highCount > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-red-400">
            <AlertTriangle className="w-3 h-3" />
            {highCount} high-severity drift item{highCount !== 1 ? "s" : ""} need attention
          </div>
        )}
      </div>

      {/* Drift items */}
      {report.driftItems.length > 0 && (
        <div style={{ borderTop: `1px solid ${g.from}20` }}>
          <button
            onClick={() => setShowDrift(!showDrift)}
            className="w-full flex items-center justify-between px-4 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{report.driftItems.length} drift item{report.driftItems.length !== 1 ? "s" : ""}</span>
            {showDrift ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <AnimatePresence>
            {showDrift && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
              >
                <div className="px-3 pb-3 space-y-1.5">
                  {report.driftItems.map((item, i) => {
                    const c = SEV_COLOR[item.severity];
                    return (
                      <div key={i} className="flex items-start gap-2 p-2 rounded text-[11px]"
                        style={{ background: `${c}08`, border: `1px solid ${c}20` }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: c }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-[10px]" style={{ color: c }}>{TYPE_LABEL[item.type] ?? item.type}</span>
                            <span className="font-semibold truncate">{item.title}</span>
                          </div>
                          <p className="text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>
                          {(item.filePath || item.specSection) && (
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground font-mono">
                              {item.filePath && <span className="truncate">{item.filePath}</span>}
                              {item.specSection && <span className="text-violet-400">§ {item.specSection}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {report.driftItems.length === 0 && (
        <div className="px-4 pb-4 flex items-center gap-2 text-[11px] text-green-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          No drift detected — spec and codebase are aligned.
        </div>
      )}
    </div>
  );
}
