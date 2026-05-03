import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitPullRequest, Loader2, AlertTriangle, CheckCircle2, Copy, Check, ChevronDown, ChevronUp, ExternalLink, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Deviation {
  file: string;
  issue: string;
  severity: "high" | "medium" | "low";
}

interface PrResult {
  prUrl: string;
  prTitle: string;
  prBranch: string;
  changedFiles: number;
  description: string;
  implementedSections: string[];
  deviations: Deviation[];
  alignmentScore: number;
}

const SEV_COLOR: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981",
};

export function PrAgentPanel({ specId }: { specId: number }) {
  const { toast } = useToast();
  const [prUrl, setPrUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PrResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDeviations, setShowDeviations] = useState(true);

  const handleAnalyze = async () => {
    if (!prUrl.trim()) {
      toast({ title: "PR URL required", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/specs/${specId}/pr-description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prUrl: prUrl.trim(), githubToken: githubToken.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data);
    } catch (err: any) {
      toast({ title: "PR analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.description);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "PR description copied!" });
  };

  const scoreColor = result
    ? result.alignmentScore >= 80 ? "#10B981" : result.alignmentScore >= 50 ? "#F59E0B" : "#EF4444"
    : "#7C3AED";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <GitPullRequest className="w-4 h-4" style={{ color: "#7C3AED" }} />
        <h3 className="text-sm font-semibold">PR Description Agent</h3>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded ml-1"
          style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.25)" }}
        >
          AI
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Paste a GitHub PR URL. The agent reads the diff, maps changes to this spec, and writes a PR description.
      </p>

      <div className="space-y-2">
        <Input
          placeholder="https://github.com/owner/repo/pull/123"
          value={prUrl}
          onChange={e => setPrUrl(e.target.value)}
          className="font-mono text-xs"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          onKeyDown={e => e.key === "Enter" && handleAnalyze()}
        />

        <button
          onClick={() => setShowToken(!showToken)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Key className="w-3 h-3" />
          {showToken ? "Hide" : "Add"} GitHub token (optional, for private repos)
          {showToken ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        <AnimatePresence>
          {showToken && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            >
              <Input
                type="password"
                placeholder="ghp_..."
                value={githubToken}
                onChange={e => setGithubToken(e.target.value)}
                className="font-mono text-xs"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Token is sent to the server, not stored.</p>
            </motion.div>
          )}
        </AnimatePresence>

        <Button onClick={handleAnalyze} disabled={loading} size="sm" className="w-full font-mono text-xs">
          {loading ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Analyzing PR…</> : <><GitPullRequest className="w-3 h-3 mr-2" /> Analyze PR</>}
        </Button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="space-y-3"
          >
            {/* Score + meta */}
            <div className="flex items-center gap-3 p-3 rounded-lg"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="text-center shrink-0">
                <div className="text-2xl font-bold font-mono" style={{ color: scoreColor }}>{result.alignmentScore}%</div>
                <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">aligned</div>
              </div>
              <div className="flex-1 min-w-0">
                <a href={result.prUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-semibold hover:underline flex items-center gap-1 truncate"
                  style={{ color: "#a78bfa" }}
                >
                  {result.prTitle} <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
                <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  {result.prBranch} · {result.changedFiles} files changed
                </div>
                {result.implementedSections.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {result.implementedSections.slice(0, 4).map(s => (
                      <span key={s} className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                        style={{ background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}
                      >{s}</span>
                    ))}
                    {result.implementedSections.length > 4 && (
                      <span className="text-[9px] text-muted-foreground">+{result.implementedSections.length - 4} more</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Deviations */}
            {result.deviations.length > 0 && (
              <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                <button
                  onClick={() => setShowDeviations(!showDeviations)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-yellow-400" />
                    <span>{result.deviations.length} spec deviation{result.deviations.length !== 1 ? "s" : ""}</span>
                  </span>
                  {showDeviations ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <AnimatePresence>
                  {showDeviations && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    >
                      <div className="p-2 space-y-1.5">
                        {result.deviations.map((d, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded text-[11px]"
                            style={{ background: `${SEV_COLOR[d.severity]}08`, border: `1px solid ${SEV_COLOR[d.severity]}22` }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: SEV_COLOR[d.severity] }} />
                            <div>
                              <code className="text-[10px] font-mono" style={{ color: SEV_COLOR[d.severity] }}>{d.file}</code>
                              <p className="text-muted-foreground mt-0.5">{d.issue}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {result.deviations.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-green-400 px-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                No spec deviations detected — implementation matches spec.
              </div>
            )}

            {/* Generated description */}
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center justify-between px-3 py-2"
                style={{ background: "rgba(124,58,237,0.1)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span className="text-xs font-mono font-bold" style={{ color: "#a78bfa" }}>GENERATED PR DESCRIPTION</span>
                <button onClick={handleCopy}
                  className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="p-3 text-[11px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                {result.description}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
