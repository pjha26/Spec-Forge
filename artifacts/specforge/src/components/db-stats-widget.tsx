import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, TrendingUp, FileText, Brain, History, MessageSquare, BarChart3, ChevronDown, ChevronUp } from "lucide-react";

interface Stats {
  totalSpecs: number;
  completedSpecs: number;
  failedSpecs: number;
  weekSpecs: number;
  byType: Array<{ specType: string; count: number }>;
  byModel: Array<{ aiModel: string; count: number }>;
  recentActivity: Array<{ day: string; count: number }>;
  complexity: { avg: number | null; max: number | null; min: number | null; withScore: number };
  versions: number;
  conversations: number;
  annotations: number;
}

const TYPE_COLORS: Record<string, string> = {
  system_design:   "#7C3AED",
  api_design:      "#06B6D4",
  database_schema: "#F59E0B",
  feature_spec:    "#10B981",
};

const TYPE_LABELS: Record<string, string> = {
  system_design:   "System Design",
  api_design:      "API Design",
  database_schema: "DB Schema",
  feature_spec:    "Feature Spec",
};

const MODEL_COLORS: Record<string, string> = {
  "claude-sonnet-4-6": "#A78BFA",
  "gpt-5.4":           "#34D399",
  "gpt-5.1":           "#60A5FA",
};

export function DbStatsWidget() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="border-border bg-card p-4 flex items-center gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-mono">Loading stats…</span>
      </Card>
    );
  }

  if (!stats || stats.totalSpecs === 0) return null;

  // Build sparkline from recentActivity (last 14 days)
  const today = new Date();
  const sparkDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });
  const activityMap = Object.fromEntries(stats.recentActivity.map(r => [r.day, r.count]));
  const sparkValues = sparkDays.map(d => activityMap[d] ?? 0);
  const sparkMax = Math.max(...sparkValues, 1);

  const successRate = stats.completedSpecs > 0
    ? Math.round((stats.completedSpecs / Math.max(stats.totalSpecs, 1)) * 100)
    : 0;

  const topType = stats.byType[0];
  const topModel = stats.byModel[0]?.aiModel ?? "—";
  const modelLabel = topModel.replace("claude-sonnet-4-6", "Claude Sonnet").replace("gpt-5.4", "GPT-5.4");

  return (
    <Card className="border-border bg-card overflow-hidden">
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none"
        style={{ borderBottom: expanded ? "1px solid rgba(255,255,255,0.06)" : "none" }}
        onClick={() => setExpanded(v => !v)}
      >
        <BarChart3 className="w-3.5 h-3.5 shrink-0" style={{ color: "#A78BFA" }} />
        <h3 className="text-xs font-mono font-bold text-foreground flex-1">Usage Stats</h3>

        <div className="flex items-center gap-3 mr-1 text-[10px] font-mono text-muted-foreground">
          <span><span className="text-foreground font-bold">{stats.totalSpecs}</span> specs</span>
          {stats.weekSpecs > 0 && (
            <span className="flex items-center gap-0.5" style={{ color: "#22C55E" }}>
              <TrendingUp className="w-2.5 h-2.5" />
              {stats.weekSpecs} this week
            </span>
          )}
        </div>

        {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Sparkline */}
          <div>
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Last 14 Days</p>
            <div className="flex items-end gap-0.5 h-8">
              {sparkValues.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all"
                  style={{
                    height: `${Math.max(v > 0 ? 15 : 2, Math.round((v / sparkMax) * 100))}%`,
                    background: v > 0
                      ? `rgba(124,58,237,${0.3 + (v / sparkMax) * 0.7})`
                      : "rgba(255,255,255,0.06)",
                  }}
                  title={`${sparkDays[i]}: ${v} spec${v !== 1 ? "s" : ""}`}
                />
              ))}
            </div>
          </div>

          {/* Key metrics row */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: FileText,      label: "Completed",   value: `${stats.completedSpecs}`, sub: `${successRate}% success`, color: "#22C55E" },
              { icon: History,       label: "Versions",    value: `${stats.versions}`,       sub: "snapshots saved",         color: "#A78BFA" },
              { icon: MessageSquare, label: "Chats",       value: `${stats.conversations}`,  sub: "conversations",           color: "#06B6D4" },
              { icon: Brain,         label: "Avg Score",   value: stats.complexity.avg != null ? `${stats.complexity.avg}` : "—", sub: "complexity", color: "#F59E0B" },
            ].map(({ icon: Icon, label, value, sub, color }) => (
              <div key={label} className="rounded-lg p-2.5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3 h-3 shrink-0" style={{ color }} />
                  <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wide">{label}</span>
                </div>
                <p className="text-sm font-bold" style={{ color }}>{value}</p>
                <p className="text-[9px] text-muted-foreground font-mono opacity-60">{sub}</p>
              </div>
            ))}
          </div>

          {/* By spec type */}
          {stats.byType.length > 0 && (
            <div>
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-2">By Type</p>
              <div className="space-y-1.5">
                {stats.byType.map(t => {
                  const pct = Math.round((t.count / Math.max(stats.totalSpecs, 1)) * 100);
                  const color = TYPE_COLORS[t.specType] ?? "#6B7280";
                  return (
                    <div key={t.specType} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[9px] font-mono">
                        <span className="text-muted-foreground">{TYPE_LABELS[t.specType] ?? t.specType}</span>
                        <span style={{ color }}>{t.count} ({pct}%)</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* By model */}
          {stats.byModel.length > 0 && (
            <div>
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-2">By Model</p>
              <div className="flex flex-wrap gap-1.5">
                {stats.byModel.map(m => {
                  const color = MODEL_COLORS[m.aiModel] ?? "#6B7280";
                  const label = m.aiModel.replace("claude-sonnet-4-6", "Claude").replace("gpt-5.4", "GPT-5.4").replace("gpt-5.1", "GPT-5.1");
                  return (
                    <div key={m.aiModel} className="flex items-center gap-1.5 rounded px-2 py-1"
                      style={{ background: `${color}14`, border: `1px solid ${color}30` }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                      <span className="text-[9px] font-mono" style={{ color }}>{label}</span>
                      <span className="text-[9px] text-muted-foreground font-mono">×{m.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
