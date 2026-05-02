import { useState } from "react";
import { History, GitCommit, RefreshCw, Zap, GitBranch, X, Loader2, ChevronRight } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface VersionMeta {
  id: number;
  specId: number;
  complexityScore: number | null;
  triggeredBy: string;
  createdAt: string;
}

interface VersionFull extends VersionMeta {
  content: string;
  techDebtRisks: string | null;
  complexitySummary: string | null;
  mermaidDiagram: string | null;
}

const TRIGGER_META: Record<string, { label: string; color: string; Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  initial:        { label: "Initial generation", color: "#10B981", Icon: GitBranch },
  manual:         { label: "Manual sync",         color: "#06B6D4", Icon: RefreshCw },
  github_webhook: { label: "GitHub push",          color: "#8B5CF6", Icon: Zap },
};

interface SpecVersionHistoryProps {
  specId: number;
  versions: VersionMeta[];
  loading: boolean;
}

export function SpecVersionHistory({ specId, versions, loading }: SpecVersionHistoryProps) {
  const [selected, setSelected] = useState<VersionFull | null>(null);
  const [fetching, setFetching] = useState(false);

  const openVersion = async (v: VersionMeta) => {
    setFetching(true);
    try {
      const res = await fetch(`/api/specs/${specId}/versions/${v.id}`);
      if (!res.ok) throw new Error("Failed to load version");
      const data = await res.json();
      setSelected(data);
    } catch {
      // silently fail
    } finally {
      setFetching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground font-mono opacity-60">
        No saved versions yet.
        <br />Versions are created on each generation.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1.5">
        {versions.map((v, idx) => {
          const meta = TRIGGER_META[v.triggeredBy] ?? TRIGGER_META.manual;
          const Icon = meta.Icon;
          const versionNumber = versions.length - idx;

          return (
            <button
              key={v.id}
              onClick={() => openVersion(v)}
              className="w-full group flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-all duration-150"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.25)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
              }}
            >
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}30` }}
              >
                <Icon className="w-3 h-3" style={{ color: meta.color }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold font-mono text-white">v{versionNumber}</span>
                  {v.complexityScore !== null && (
                    <span className="text-[9px] font-mono px-1.5 rounded"
                      style={{ background: "rgba(255,255,255,0.07)", color: "hsl(var(--muted-foreground))" }}
                    >
                      score {v.complexityScore}
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{meta.label}</p>
                <p className="text-[9px] text-muted-foreground opacity-50 font-mono">
                  {formatDistanceToNow(new Date(v.createdAt))} ago
                </p>
              </div>

              <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Version preview modal */}
      {(selected || fetching) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: "rgba(10,10,16,0.99)",
              border: "1px solid rgba(139,92,246,0.3)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {fetching ? (
              <div className="flex-1 flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "hsl(263,90%,70%)" }} />
              </div>
            ) : selected ? (
              <>
                <div className="flex items-center justify-between px-6 py-4 shrink-0"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}
                    >
                      <History className="w-4 h-4" style={{ color: "hsl(263,90%,74%)" }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        Version {selected.id} snapshot
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {format(new Date(selected.createdAt), "MMM d, yyyy · HH:mm")} · {(TRIGGER_META[selected.triggeredBy] ?? TRIGGER_META.manual).label}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: "rgba(255,255,255,0.06)", color: "hsl(var(--muted-foreground))" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-8 prose prose-invert max-w-none prose-pre:bg-black/50 prose-pre:border prose-pre:border-border">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content}</ReactMarkdown>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
