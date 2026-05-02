import { AlertCircle, CheckCircle2, AlertTriangle, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TechDebtRisk {
  title: string;
  severity: "high" | "medium" | "low";
  description: string;
}

interface ComplexityScoreCardProps {
  score: number | null;
  label?: string | null;
  risks: TechDebtRisk[] | null;
  summary: string | null;
  isGenerating?: boolean;
}

export function ComplexityScoreCard({ score, label, risks, summary, isGenerating }: ComplexityScoreCardProps) {
  if (isGenerating && score === null) {
    return (
      <div className="rounded-xl overflow-hidden glass-card animate-pulse">
        <div className="p-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Activity className="w-4 h-4" style={{ color: "hsl(263,90%,64%)" }} />
          <span className="text-sm font-mono font-bold text-muted-foreground">Analyzing…</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-4 items-center">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="space-y-2 pt-3">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (score === null) return null;

  const getScoreMeta = (s: number) => {
    if (s <= 3) return { color: "#34D399", glow: "rgba(52,211,153,0.5)", bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.3)", label: "LOW" };
    if (s <= 6) return { color: "#FCD34D", glow: "rgba(252,211,77,0.5)", bg: "rgba(252,211,77,0.1)", border: "rgba(252,211,77,0.3)", label: "MEDIUM" };
    return { color: "#F87171", glow: "rgba(248,113,113,0.5)", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)", label: "HIGH" };
  };

  const meta = getScoreMeta(score);

  const getSeverityMeta = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high": return { color: "#F87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)", label: "HIGH", icon: AlertCircle };
      case "medium": return { color: "#FCD34D", bg: "rgba(252,211,77,0.1)", border: "rgba(252,211,77,0.25)", label: "MED", icon: AlertTriangle };
      default: return { color: "#34D399", bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.25)", label: "LOW", icon: CheckCircle2 };
    }
  };

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 10) * circumference;

  return (
    <div className="rounded-xl overflow-hidden glass-card animate-pop-in">
      <div className="p-3 flex items-center gap-2"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <Activity className="w-4 h-4" style={{ color: "hsl(263,90%,64%)" }} />
        <span className="text-sm font-mono font-bold">System Analysis</span>
      </div>

      <div className="p-5 space-y-5">
        <div className="flex gap-5 items-center">
          <div className="relative flex items-center justify-center shrink-0">
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
              <circle
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                stroke={meta.color}
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{
                  transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)",
                  filter: `drop-shadow(0 0 6px ${meta.glow})`,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-mono font-bold" style={{ color: meta.color }}>{score}</span>
              <span className="text-[9px] text-muted-foreground font-mono">/ 10</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-foreground">Complexity Score</h4>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md"
                style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
              >
                {label?.toUpperCase() ?? meta.label}
              </span>
            </div>
            {summary && <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>}
          </div>
        </div>

        {risks && risks.length > 0 && (
          <div className="space-y-2.5 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <h4 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Tech Debt Risks</h4>
            <div className="space-y-2">
              {risks.map((risk, i) => {
                const sev = getSeverityMeta(risk.severity);
                const SevIcon = sev.icon;
                return (
                  <div
                    key={i}
                    className="flex gap-3 p-3 rounded-lg"
                    style={{
                      background: sev.bg,
                      border: `1px solid ${sev.border}`,
                    }}
                  >
                    <SevIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: sev.color }} />
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-foreground">{risk.title}</span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-px rounded"
                          style={{ background: `${sev.color}22`, color: sev.color, border: `1px solid ${sev.color}44` }}
                        >
                          {sev.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{risk.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
