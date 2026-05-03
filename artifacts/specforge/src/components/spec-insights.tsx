import { useState } from "react";
import {
  Sparkles, Loader2, CheckCircle2, AlertCircle, XCircle,
  TrendingUp, Lightbulb, AlertTriangle, Clock,
} from "lucide-react";

interface SpecInsightsResponse {
  completeness: number;
  overallHealth: "excellent" | "good" | "fair" | "poor";
  missingAreas: string[];
  strengthAreas: string[];
  suggestions: string[];
  estimatedImplementationDays: number;
}

const HEALTH_META = {
  excellent: { label: "Excellent", color: "#10B981", Icon: CheckCircle2, bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)" },
  good:      { label: "Good",      color: "#06B6D4", Icon: CheckCircle2, bg: "rgba(6,182,212,0.1)",  border: "rgba(6,182,212,0.25)" },
  fair:      { label: "Fair",      color: "#F59E0B", Icon: AlertCircle,  bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
  poor:      { label: "Poor",      color: "#EF4444", Icon: XCircle,      bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.25)" },
};

interface SpecInsightsProps {
  specId: number;
}

export function SpecInsights({ specId }: SpecInsightsProps) {
  const [insights, setInsights] = useState<SpecInsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/specs/${specId}/insights`, { method: "POST" });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setInsights(data);
    } catch {
      setError("Failed to analyze spec. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!insights && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(0,180,216,0.12), rgba(56,189,248,0.08))",
              border: "1px solid rgba(0,180,216,0.22)",
            }}
          >
            <Sparkles className="w-7 h-7" style={{ color: "hsl(191,100%,52%)" }} />
          </div>
          <div className="absolute -inset-4 rounded-3xl opacity-20 blur-xl"
            style={{ background: "radial-gradient(circle, rgba(0,180,216,0.5), transparent)" }}
          />
        </div>
        <div className="text-center space-y-1.5 max-w-xs">
          <p className="font-bold text-sm text-white">AI Spec Health Analysis</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Get a detailed breakdown of completeness, missing areas, and actionable improvement suggestions powered by Claude.
          </p>
        </div>
        {error && (
          <p className="text-xs text-red-400 font-mono">{error}</p>
        )}
        <button
          onClick={analyze}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-sm font-bold transition-all duration-200 btn-gradient"
        >
          <Sparkles className="w-4 h-4" />
          Analyze Spec
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(191,100%,52%)" }} />
          <div className="absolute -inset-4 rounded-full opacity-20 blur-lg"
            style={{ background: "rgba(0,180,216,0.5)" }}
          />
        </div>
        <p className="text-sm font-mono text-muted-foreground">Analyzing spec with Claude…</p>
        <p className="text-xs text-muted-foreground opacity-60">This takes about 10–20 seconds</p>
      </div>
    );
  }

  if (!insights) return null;

  const health = HEALTH_META[insights.overallHealth] ?? HEALTH_META.fair;
  const HealthIcon = health.Icon;

  return (
    <div className="p-6 space-y-5 overflow-auto">
      {/* Header row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
          style={{ background: health.bg, border: `1px solid ${health.border}` }}
        >
          <HealthIcon className="w-4 h-4" style={{ color: health.color }} />
          <span className="font-bold text-sm" style={{ color: health.color }}>{health.label}</span>
        </div>

        <div className="flex-1 min-w-[180px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-mono text-muted-foreground">Completeness</span>
            <span className="text-sm font-bold text-white font-mono">{insights.completeness}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${insights.completeness}%`,
                background: insights.completeness >= 80
                  ? "linear-gradient(90deg, #10B981, #06B6D4)"
                  : insights.completeness >= 50
                  ? "linear-gradient(90deg, #F59E0B, #10B981)"
                  : "linear-gradient(90deg, #EF4444, #F59E0B)",
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground">~{insights.estimatedImplementationDays} days</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        {insights.strengthAreas.length > 0 && (
          <div className="rounded-xl p-4 space-y-2.5"
            style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" style={{ color: "#10B981" }} />
              <span className="text-xs font-bold font-mono" style={{ color: "#10B981" }}>STRENGTHS</span>
            </div>
            <ul className="space-y-1.5">
              {insights.strengthAreas.map((area, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                  <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#10B981" }} />
                  {area}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing areas */}
        {insights.missingAreas.length > 0 && (
          <div className="rounded-xl p-4 space-y-2.5"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
              <span className="text-xs font-bold font-mono" style={{ color: "#EF4444" }}>MISSING AREAS</span>
            </div>
            <ul className="space-y-1.5">
              {insights.missingAreas.map((area, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                  <XCircle className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#EF4444" }} />
                  {area}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {insights.suggestions.length > 0 && (
        <div className="rounded-xl p-4 space-y-2.5"
          style={{ background: "rgba(0,180,216,0.05)", border: "1px solid rgba(0,180,216,0.15)" }}
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-3.5 h-3.5" style={{ color: "hsl(191,100%,65%)" }} />
            <span className="text-xs font-bold font-mono" style={{ color: "hsl(191,100%,65%)" }}>IMPROVEMENT SUGGESTIONS</span>
          </div>
          <ol className="space-y-2">
            {insights.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-xs text-foreground/80">
                <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: "rgba(0,180,216,0.15)", color: "hsl(191,100%,65%)" }}
                >
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}

      <button
        onClick={analyze}
        disabled={loading}
        className="w-full py-2 rounded-lg text-xs font-mono font-bold transition-all duration-150 text-muted-foreground hover:text-foreground"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        Re-analyze
      </button>
    </div>
  );
}
