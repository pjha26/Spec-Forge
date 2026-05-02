import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, RefreshCw, Zap, GitBranch, X, Loader2, ChevronRight, FileText, GitCompare, Plus, Minus } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { diffLines, type Change } from "diff";

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

const TRIGGER_META: Record<string, {
  label: string;
  color: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}> = {
  initial:        { label: "Initial generation", color: "#10B981", Icon: GitBranch },
  manual:         { label: "Manual sync",         color: "#06B6D4", Icon: RefreshCw },
  github_webhook: { label: "GitHub push",          color: "#8B5CF6", Icon: Zap },
};

function DiffView({ oldContent, newContent }: { oldContent: string; newContent: string }) {
  const changes: Change[] = useMemo(
    () => diffLines(oldContent, newContent, { newlineIsToken: false }),
    [oldContent, newContent]
  );

  const added   = changes.filter(c => c.added).reduce((n, c) => n + (c.count ?? 0), 0);
  const removed = changes.filter(c => c.removed).reduce((n, c) => n + (c.count ?? 0), 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.3)" }}
      >
        <span className="text-xs font-mono font-bold flex items-center gap-1" style={{ color: "#10B981" }}>
          <Plus className="w-3 h-3" />{added} added
        </span>
        <span className="text-xs font-mono font-bold flex items-center gap-1" style={{ color: "#EF4444" }}>
          <Minus className="w-3 h-3" />{removed} removed
        </span>
        <span className="text-xs font-mono text-muted-foreground opacity-60 ml-auto">snapshot → current</span>
      </div>
      <div className="flex-1 overflow-auto font-mono text-xs leading-relaxed">
        {changes.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground py-16">
            No differences found — this version matches the current document.
          </div>
        )}
        {changes.map((change, i) => {
          if (change.added) {
            return (
              <motion.div key={i} className="flex"
                style={{ background: "rgba(16,185,129,0.12)", borderLeft: "3px solid #10B981" }}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.005, 0.3) }}
              >
                <span className="w-6 shrink-0 text-center py-0.5 select-none"
                  style={{ color: "#10B981", background: "rgba(16,185,129,0.15)" }}
                >+</span>
                <pre className="flex-1 px-3 py-0.5 text-[11px] whitespace-pre-wrap break-all" style={{ color: "#86EFAC" }}>
                  {change.value}
                </pre>
              </motion.div>
            );
          }
          if (change.removed) {
            return (
              <motion.div key={i} className="flex"
                style={{ background: "rgba(239,68,68,0.10)", borderLeft: "3px solid #EF4444" }}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.005, 0.3) }}
              >
                <span className="w-6 shrink-0 text-center py-0.5 select-none"
                  style={{ color: "#EF4444", background: "rgba(239,68,68,0.15)" }}
                >−</span>
                <pre className="flex-1 px-3 py-0.5 text-[11px] whitespace-pre-wrap break-all"
                  style={{ color: "#FCA5A5", textDecoration: "line-through", textDecorationColor: "rgba(239,68,68,0.5)" }}
                >
                  {change.value}
                </pre>
              </motion.div>
            );
          }
          const lines = change.value.split("\n").filter(Boolean);
          const CONTEXT = 3;
          if (lines.length > CONTEXT * 2 + 1) {
            const top    = lines.slice(0, CONTEXT).join("\n");
            const bottom = lines.slice(-CONTEXT).join("\n");
            const hidden = lines.length - CONTEXT * 2;
            return (
              <div key={i}>
                <pre className="flex-1 px-3 py-0.5 text-[11px] whitespace-pre-wrap break-all text-muted-foreground opacity-50"
                  style={{ borderLeft: "3px solid transparent" }}
                >{top}</pre>
                <div className="px-4 py-1 text-[10px] font-mono text-muted-foreground opacity-40 select-none"
                  style={{ background: "rgba(255,255,255,0.02)", borderLeft: "3px solid rgba(255,255,255,0.08)" }}
                >⋯ {hidden} unchanged lines</div>
                <pre className="flex-1 px-3 py-0.5 text-[11px] whitespace-pre-wrap break-all text-muted-foreground opacity-50"
                  style={{ borderLeft: "3px solid transparent" }}
                >{bottom}</pre>
              </div>
            );
          }
          return (
            <pre key={i}
              className="flex-1 px-3 py-0.5 text-[11px] whitespace-pre-wrap break-all text-muted-foreground opacity-40"
              style={{ borderLeft: "3px solid transparent" }}
            >{change.value}</pre>
          );
        })}
      </div>
    </div>
  );
}

interface SpecVersionHistoryProps {
  specId: number;
  versions: VersionMeta[];
  loading: boolean;
  currentContent?: string;
}

export function SpecVersionHistory({ specId, versions, loading, currentContent }: SpecVersionHistoryProps) {
  const [selected, setSelected]   = useState<VersionFull | null>(null);
  const [fetching, setFetching]   = useState(false);
  const [modalTab, setModalTab]   = useState<"document" | "diff">("document");

  const openVersion = async (v: VersionMeta) => {
    setFetching(true);
    setModalTab("document");
    try {
      const res = await fetch(`/api/specs/${specId}/versions/${v.id}`);
      if (!res.ok) throw new Error("Failed to load version");
      setSelected(await res.json());
    } catch {
      // silently fail
    } finally {
      setFetching(false);
    }
  };

  const close = () => { setSelected(null); setModalTab("document"); };

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
            <motion.button
              key={v.id}
              onClick={() => openVersion(v)}
              className="w-full group flex items-center gap-2.5 p-2.5 rounded-lg text-left"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04, type: "spring", stiffness: 400, damping: 30 }}
              whileHover={{ scale: 1.01, background: "rgba(255,255,255,0.06)", borderColor: "rgba(139,92,246,0.25)" } as any}
              whileTap={{ scale: 0.98 }}
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
                    >score {v.complexityScore}</span>
                  )}
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{meta.label}</p>
                <p className="text-[9px] text-muted-foreground opacity-50 font-mono">
                  {formatDistanceToNow(new Date(v.createdAt))} ago
                </p>
              </div>
              <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
            </motion.button>
          );
        })}
      </div>

      {/* Animated Modal */}
      <AnimatePresence>
        {(selected || fetching) && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
          >
            <motion.div
              style={{ background: "rgba(0,0,0,0.7)" }}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="w-full max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col relative"
              style={{
                background: "rgba(10,10,16,0.99)",
                border: "1px solid rgba(139,92,246,0.3)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(139,92,246,0.1)",
              }}
              initial={{ scale: 0.88, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.8 }}
              onClick={e => e.stopPropagation()}
            >
              {fetching ? (
                <div className="flex-1 flex items-center justify-center py-20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-6 h-6" style={{ color: "hsl(263,90%,70%)" }} />
                  </motion.div>
                </div>
              ) : selected ? (
                <>
                  <div className="flex items-center justify-between px-6 py-4 shrink-0"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.05 }}
                      >
                        <History className="w-4 h-4" style={{ color: "hsl(263,90%,74%)" }} />
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.08 }}
                      >
                        <p className="text-sm font-bold text-white">
                          Version snapshot
                          {(() => {
                            const idx = versions.findIndex(v => v.id === selected.id);
                            return idx >= 0 ? ` · v${versions.length - idx}` : "";
                          })()}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground">
                          {format(new Date(selected.createdAt), "MMM d, yyyy · HH:mm")}
                          {" · "}
                          {(TRIGGER_META[selected.triggeredBy] ?? TRIGGER_META.manual).label}
                        </p>
                      </motion.div>
                    </div>

                    <div className="flex items-center gap-2">
                      <motion.div
                        className="flex items-center rounded-lg overflow-hidden"
                        style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <button
                          onClick={() => setModalTab("document")}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-bold transition-all duration-150"
                          style={{
                            background: modalTab === "document" ? "rgba(139,92,246,0.25)" : "transparent",
                            color: modalTab === "document" ? "hsl(263,90%,74%)" : "hsl(var(--muted-foreground))",
                          }}
                        >
                          <FileText className="w-3 h-3" />
                          Document
                        </button>
                        <button
                          onClick={() => setModalTab("diff")}
                          disabled={!currentContent}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-bold transition-all duration-150 disabled:opacity-40"
                          style={{
                            background: modalTab === "diff" ? "rgba(6,182,212,0.2)" : "transparent",
                            color: modalTab === "diff" ? "#06B6D4" : "hsl(var(--muted-foreground))",
                          }}
                        >
                          <GitCompare className="w-3 h-3" />
                          Changes
                        </button>
                      </motion.div>

                      <motion.button
                        onClick={close}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.06)", color: "hsl(var(--muted-foreground))" }}
                        whileHover={{ scale: 1.1, background: "rgba(255,255,255,0.14)" } as any}
                        whileTap={{ scale: 0.9 }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.12 }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={modalTab}
                        className="h-full overflow-auto"
                        initial={{ opacity: 0, x: modalTab === "document" ? -12 : 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: modalTab === "document" ? 12 : -12 }}
                        transition={{ duration: 0.18 }}
                      >
                        {modalTab === "document" ? (
                          <div className="p-8 prose prose-invert max-w-none prose-pre:bg-black/50 prose-pre:border prose-pre:border-border">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content}</ReactMarkdown>
                          </div>
                        ) : (
                          currentContent && (
                            <DiffView oldContent={selected.content} newContent={currentContent} />
                          )
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
