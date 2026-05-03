import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, ExternalLink, CheckCircle2, GitBranch,
  AlertCircle, ChevronDown, ChevronUp, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

type Platform = "linear" | "jira";
type Issue = {
  id: number; specId: number; sectionTitle: string;
  issueTitle: string; issueId: string; issueUrl: string;
  platform: string; status: string; createdAt: string;
};

interface Props {
  specId: number;
  specContent: string;
}

const PLATFORM_META = {
  linear: { label: "Linear",  color: "#5E6AD2", bg: "rgba(94,106,210,0.12)", border: "rgba(94,106,210,0.35)" },
  jira:   { label: "Jira",    color: "#0052CC", bg: "rgba(0,82,204,0.12)",   border: "rgba(0,82,204,0.35)" },
};

export function LinearSyncPanel({ specId }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("linear");
  const [syncing, setSyncing] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadIssues = async () => {
    try {
      const res = await fetch(`/api/specs/${specId}/issues`);
      if (res.ok) {
        const data = await res.json();
        setIssues(data.issues ?? []);
      }
    } catch { /* ignore */ }
    setLoaded(true);
  };

  const handleToggle = () => {
    if (!open && !loaded) loadIssues();
    setOpen(p => !p);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/specs/${specId}/sync-issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: "Sync failed",
          description: data.error ?? "Check your integration settings",
          variant: "destructive",
        });
        return;
      }
      setIssues(data.issues ?? []);
      toast({
        title: `${data.created} issue${data.created !== 1 ? "s" : ""} created in ${PLATFORM_META[platform].label}`,
        description: "All tasks extracted from this spec have been synced.",
      });
    } catch {
      toast({ title: "Sync failed", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const grouped = issues.reduce<Record<string, Issue[]>>((acc, issue) => {
    const key = issue.sectionTitle;
    if (!acc[key]) acc[key] = [];
    acc[key].push(issue);
    return acc;
  }, {});

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(94,106,210,0.15)", border: "1px solid rgba(94,106,210,0.3)" }}>
            <GitBranch className="w-3.5 h-3.5" style={{ color: "#5E6AD2" }} />
          </div>
          <span className="text-sm font-semibold">Issue Sync</span>
          {issues.length > 0 && (
            <Badge variant="outline" className="text-[9px] font-mono"
              style={{ color: "#5E6AD2", borderColor: "rgba(94,106,210,0.4)", background: "rgba(94,106,210,0.1)" }}>
              {issues.length} synced
            </Badge>
          )}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border/40">
              {/* Platform selector */}
              <div className="flex items-center gap-2 pt-3">
                {(["linear", "jira"] as Platform[]).map(p => {
                  const meta = PLATFORM_META[p];
                  return (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
                      style={platform === p ? {
                        background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color,
                      } : {
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                        color: "hsl(var(--muted-foreground))",
                      }}
                    >
                      {meta.label}
                    </button>
                  );
                })}
                <Link href="/app/integrations">
                  <span className="text-[10px] font-mono text-muted-foreground/50 hover:text-primary ml-auto cursor-pointer transition-colors">
                    Configure →
                  </span>
                </Link>
              </div>

              {/* Sync button */}
              <Button
                size="sm"
                className="w-full font-mono text-xs"
                onClick={handleSync}
                disabled={syncing}
                style={{
                  background: syncing ? undefined : "linear-gradient(135deg, #5E6AD2, #4f5ab5)",
                  border: "none",
                }}
              >
                {syncing
                  ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Extracting tasks & creating issues…</>
                  : <><Zap className="w-3 h-3 mr-2" />Sync to {PLATFORM_META[platform].label}</>
                }
              </Button>

              {/* Issue list */}
              {Object.keys(grouped).length > 0 && (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {Object.entries(grouped).map(([section, sectionIssues]) => (
                    <div key={section}>
                      <p className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-1.5">
                        {section}
                      </p>
                      <div className="space-y-1">
                        {sectionIssues.map(issue => {
                          const meta = PLATFORM_META[issue.platform as Platform] ?? PLATFORM_META.linear;
                          return (
                            <a
                              key={issue.id}
                              href={issue.issueUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all group"
                              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                            >
                              <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: meta.color }} />
                              <span className="flex-1 truncate text-white/80 group-hover:text-white">{issue.issueTitle}</span>
                              <span className="font-mono text-[9px] shrink-0" style={{ color: meta.color }}>{issue.issueId}</span>
                              <ExternalLink className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {loaded && issues.length === 0 && !syncing && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono py-2">
                  <AlertCircle className="w-3.5 h-3.5 opacity-40" />
                  No issues synced yet — click Sync to create them
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
