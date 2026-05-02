import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useGetSpec } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft, Copy, Download, Server, Cpu, Database, BookOpen,
  Github, FileText, Clock, Terminal, FileCode2, Network, Bot,
  Share2, Printer, Eye, Loader2, RefreshCw, Webhook, ChevronDown, ChevronUp, Check,
  Sparkles, History, Users, Shield, Code2,
} from "lucide-react";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { ComplexityScoreCard } from "@/components/complexity-score-card";
import { SpecChat } from "@/components/spec-chat";
import { PresenceBar } from "@/components/presence-bar";
import { SpecInsights } from "@/components/spec-insights";
import { SpecVersionHistory } from "@/components/spec-version-history";
import { SpecScaffold } from "@/components/spec-scaffold";

export default function SpecDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"document" | "diagram" | "chat" | "insights">("document");
  const [showScaffold, setShowScaffold] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareData, setShareData] = useState<{ shareUrl: string; viewCount: number } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [webhookConfig, setWebhookConfig] = useState<{ webhookUrl: string; secret: string; instructions: string } | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<"url" | "secret" | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [versions, setVersions] = useState<Array<{
    id: number; specId: number; complexityScore: number | null;
    triggeredBy: string; createdAt: string;
  }>>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const { data: spec, isLoading, error } = useGetSpec(Number(id));

  const isGitHub = spec?.inputType === "github_url";

  useEffect(() => {
    if (spec?.status === "generating") {
      setIsSyncing(true);
      pollingRef.current = setInterval(async () => {
        await queryClient.invalidateQueries({ queryKey: [`/api/specs/${id}`] });
      }, 3000);
    } else {
      if (isSyncing && spec?.status === "completed") {
        toast({ title: "Sync complete!", description: "Spec regenerated from latest source." });
      }
      setIsSyncing(false);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [spec?.status]);

  useEffect(() => {
    if (!spec?.id) return;
    setVersionsLoading(true);
    fetch(`/api/specs/${spec.id}/versions`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.versions) setVersions(data.versions); })
      .catch(() => {})
      .finally(() => setVersionsLoading(false));
  }, [spec?.id, spec?.status]);

  const handleCopy = () => {
    if (spec?.content) {
      navigator.clipboard.writeText(spec.content);
      toast({ title: "Copied to clipboard" });
    }
  };

  const handleDownload = () => {
    if (spec?.content) {
      const blob = new Blob([spec.content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${spec.title.toLowerCase().replace(/\s+/g, "-")}-${spec.specType}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const [isExportingDocx, setIsExportingDocx] = useState(false);

  // Team assignment
  const [userTeams, setUserTeams] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [assigningTeam, setAssigningTeam] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<number | null>(null);

  useEffect(() => {
    if (!spec?.id) return;
    setCurrentTeamId((spec as any).teamId ?? null);
  }, [spec?.id]);

  useEffect(() => {
    fetch("/api/teams")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.teams) setUserTeams(d.teams); })
      .catch(() => {});
  }, []);

  const handleAssignTeam = async (teamId: number | null) => {
    if (!spec) return;
    setAssigningTeam(true);
    try {
      if (teamId === null) {
        // Remove from current team
        if (currentTeamId) {
          await fetch(`/api/teams/${currentTeamId}/specs/${spec.id}`, { method: "DELETE" });
        }
        setCurrentTeamId(null);
        toast({ title: "Removed from team" });
      } else {
        await fetch(`/api/teams/${teamId}/specs/${spec.id}`, { method: "POST" });
        setCurrentTeamId(teamId);
        toast({ title: "Assigned to team!" });
      }
    } catch {
      toast({ title: "Failed to update team assignment", variant: "destructive" });
    } finally {
      setAssigningTeam(false);
    }
  };
  const handleDownloadDocx = async () => {
    if (!spec) return;
    setIsExportingDocx(true);
    try {
      const res = await fetch(`/api/specs/${spec.id}/export/docx`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${spec.title.toLowerCase().replace(/\s+/g, "-")}-spec.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Word document downloaded!" });
    } catch {
      toast({ title: "DOCX export failed", variant: "destructive" });
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handlePrint = () => window.print();

  const handleShare = async () => {
    if (!spec) return;
    setIsSharing(true);
    try {
      const res = await fetch(`/api/specs/${spec.id}/share`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setShareData({ shareUrl: data.shareUrl, viewCount: data.viewCount });
      await navigator.clipboard.writeText(data.shareUrl);
      toast({ title: "Share link copied!", description: `${data.viewCount} view${data.viewCount !== 1 ? "s" : ""} so far` });
    } catch {
      toast({ title: "Failed to generate share link", variant: "destructive" });
    } finally {
      setIsSharing(false);
    }
  };

  const handleSync = async () => {
    if (!spec) return;
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/specs/${spec.id}/sync`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast({ title: "Sync started", description: "Re-generating from latest source…" });
      pollingRef.current = setInterval(async () => {
        await queryClient.invalidateQueries({ queryKey: [`/api/specs/${id}`] });
      }, 3000);
    } catch {
      toast({ title: "Sync failed", variant: "destructive" });
      setIsSyncing(false);
    }
  };

  const handleWebhookToggle = async () => {
    if (showWebhook) { setShowWebhook(false); return; }
    setShowWebhook(true);
    if (webhookConfig) return;
    setWebhookLoading(true);
    try {
      const res = await fetch(`/api/specs/${spec?.id}/webhook`);
      if (!res.ok) throw new Error();
      setWebhookConfig(await res.json());
    } catch {
      toast({ title: "Failed to load webhook config", variant: "destructive" });
    } finally {
      setWebhookLoading(false);
    }
  };

  const copyField = async (text: string, field: "url" | "secret") => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getSpecTypeIcon = (type: string) => {
    switch (type) {
      case "system_design": return <Server className="w-3 h-3" />;
      case "api_design": return <Cpu className="w-3 h-3" />;
      case "database_schema": return <Database className="w-3 h-3" />;
      case "feature_spec": return <BookOpen className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  const getSpecTypeLabel = (type: string) => {
    switch (type) {
      case "system_design": return "System Design";
      case "api_design": return "API Design";
      case "database_schema": return "Database Schema";
      case "feature_spec": return "Feature Spec";
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4 text-muted-foreground">
          <Terminal className="w-8 h-8 opacity-20" />
          <span className="font-mono text-sm">Loading spec data...</span>
        </div>
      </div>
    );
  }

  if (error || !spec) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-destructive font-mono">ERR_SPEC_NOT_FOUND</h2>
          <p className="text-muted-foreground">The requested specification could not be located.</p>
          <Link href="/app/specs">
            <Button variant="outline" className="font-mono"><ArrowLeft className="w-4 h-4 mr-2" /> RETURN TO HISTORY</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background flex flex-col">
      <header className="print-hide sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/app/specs">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">{spec.title}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                {isGitHub ? <Github className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                {isGitHub ? "GitHub" : "Description"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(spec.createdAt), "MMM d, yyyy HH:mm")}</span>
              {(spec.viewCount ?? 0) > 0 && (
                <><span>•</span><span className="flex items-center gap-1"><Eye className="w-3 h-3" />{spec.viewCount} views</span></>
              )}
              {spec.lastSyncedAt && (
                <><span>•</span><span className="flex items-center gap-1 text-green-500"><RefreshCw className="w-3 h-3" />synced {formatDistanceToNow(new Date(spec.lastSyncedAt))} ago</span></>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1.5 py-1 px-2.5">
            {getSpecTypeIcon(spec.specType)}{getSpecTypeLabel(spec.specType)}
          </Badge>

          {isGitHub && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing}
                className="font-mono text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                {isSyncing ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-2" />}
                {isSyncing ? "SYNCING…" : "SYNC NOW"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleWebhookToggle}
                className="font-mono text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
              >
                <Webhook className="w-3 h-3 mr-2" />
                WEBHOOK
                {showWebhook ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
              </Button>
            </>
          )}

          <Button variant="outline" size="sm" onClick={handleShare} disabled={isSharing} className="font-mono text-xs border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
            {isSharing ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Share2 className="w-3 h-3 mr-2" />}
            SHARE
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="font-mono text-xs"><Printer className="w-3 h-3 mr-2" />PDF</Button>
          <Button variant="outline" size="sm" onClick={handleCopy} className="font-mono text-xs"><Copy className="w-3 h-3 mr-2" />COPY</Button>
          <Button variant="outline" size="sm" onClick={handleDownload} className="font-mono text-xs"><Download className="w-3 h-3 mr-2" />.MD</Button>
          <Button size="sm" onClick={handleDownloadDocx} disabled={isExportingDocx} className="font-mono text-xs">
            {isExportingDocx ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <FileCode2 className="w-3 h-3 mr-2" />}
            .DOCX
          </Button>

          <motion.button
            onClick={() => setShowScaffold(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(6,182,212,0.15))",
              border: "1px solid rgba(139,92,246,0.4)",
              color: "hsl(263,90%,74%)",
              boxShadow: "0 0 14px rgba(139,92,246,0.2)",
            }}
            whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(139,92,246,0.4)" } as any}
            whileTap={{ scale: 0.95 }}
          >
            <Code2 className="w-3 h-3" />
            SCAFFOLD
          </motion.button>
        </div>
      </header>

      <PresenceBar specId={spec.id} />

      <AnimatePresence>
        {shareData && (
          <motion.div
            className="print-hide bg-purple-500/10 border-b border-purple-500/20 px-6 py-2 flex items-center gap-3 text-xs font-mono"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          >
            <Share2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="text-purple-300 shrink-0">Share link copied:</span>
            <span className="text-muted-foreground truncate">{shareData.shareUrl}</span>
            <button onClick={() => navigator.clipboard.writeText(shareData.shareUrl).then(() => toast({ title: "Copied!" }))} className="ml-auto text-purple-400 hover:text-purple-300 shrink-0">Copy again</button>
            <button onClick={() => setShareData(null)} className="text-muted-foreground hover:text-foreground shrink-0">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSyncing && spec.status === "generating" && (
          <motion.div
            className="print-hide bg-green-500/10 border-b border-green-500/20 px-6 py-2 flex items-center gap-3 text-xs font-mono"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          >
            <Loader2 className="w-3.5 h-3.5 text-green-400 animate-spin shrink-0" />
            <span className="text-green-300">Re-generating spec from source… this may take 30–60 seconds.</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWebhook && isGitHub && (
          <motion.div
            className="print-hide bg-blue-500/10 border-b border-blue-500/20 px-6 py-4"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 35 }}
          >
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-3">
                <Webhook className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-blue-300 font-mono">GITHUB WEBHOOK SETUP</span>
                <span className="text-xs text-muted-foreground ml-1">— auto-sync on every push</span>
              </div>

              {webhookLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating webhook config…
                </div>
              ) : webhookConfig ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground font-mono mb-1.5">PAYLOAD URL</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-black/40 border border-border rounded px-2.5 py-1.5 flex-1 truncate text-green-300 font-mono">
                          {webhookConfig.webhookUrl}
                        </code>
                        <button
                          onClick={() => copyField(webhookConfig.webhookUrl, "url")}
                          className="shrink-0 p-1.5 rounded border border-border hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedField === "url" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-mono mb-1.5">SECRET</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-black/40 border border-border rounded px-2.5 py-1.5 flex-1 truncate text-yellow-300 font-mono">
                          {webhookConfig.secret}
                        </code>
                        <button
                          onClick={() => copyField(webhookConfig.secret, "secret")}
                          className="shrink-0 p-1.5 rounded border border-border hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedField === "secret" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="text-blue-400 font-semibold">Setup:</span> In your GitHub repo → Settings → Webhooks → Add webhook. Set the Payload URL and Secret above, Content type: <code className="text-xs bg-black/30 px-1 rounded">application/json</code>, and trigger on <strong>push</strong> events. SpecForge will regenerate this doc on every commit.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-destructive">Failed to load webhook config.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card className="w-full border-border bg-[#0a0a0a] flex flex-col overflow-hidden min-h-full">
              <div className="print-hide border-b border-border flex items-center justify-between bg-card px-2">
                <div className="flex">
                  {(["document", "diagram", "chat", "insights"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      disabled={tab === "diagram" && !spec.mermaidDiagram}
                      className={`px-4 py-3 text-sm font-mono flex items-center gap-2 border-b-2 transition-colors ${
                        activeTab === tab
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      }`}
                    >
                      {tab === "document" && <FileCode2 className="w-4 h-4" />}
                      {tab === "diagram" && <Network className="w-4 h-4" />}
                      {tab === "chat" && <Bot className="w-4 h-4" />}
                      {tab === "insights" && <Sparkles className="w-4 h-4" />}
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 print-content">
                {activeTab === "document" && (
                  <div className="p-8 overflow-auto prose prose-invert max-w-none prose-pre:bg-black/50 prose-pre:border prose-pre:border-border">
                    {isSyncing && spec.status === "generating" ? (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                        <p className="font-mono text-sm">Regenerating from source…</p>
                      </div>
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{spec.content}</ReactMarkdown>
                    )}
                  </div>
                )}
                {activeTab === "diagram" && spec.mermaidDiagram && (
                  <div className="p-8 min-h-[500px] h-[600px]">
                    <MermaidDiagram chart={spec.mermaidDiagram} />
                  </div>
                )}
                {activeTab === "chat" && <SpecChat specId={spec.id} />}
                {activeTab === "insights" && <SpecInsights specId={spec.id} />}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6 print-hide">
            <ComplexityScoreCard
              score={spec.complexityScore ?? null}
              label={null}
              risks={spec.techDebtRisks as any ?? null}
              summary={spec.complexitySummary ?? null}
            />

            {/* Version history */}
            <Card className="border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <History className="w-3.5 h-3.5" style={{ color: "hsl(263,90%,70%)" }} />
                <h3 className="text-xs font-mono font-bold text-foreground flex-1">Version History</h3>
                {versions.length > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(139,92,246,0.15)", color: "hsl(263,90%,70%)" }}
                  >
                    {versions.length}
                  </span>
                )}
              </div>
              <div className="p-3">
                <SpecVersionHistory
                  specId={spec.id}
                  versions={versions}
                  loading={versionsLoading}
                  currentContent={spec.content}
                />
              </div>
            </Card>

            {/* Team assignment */}
            <Card className="border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <Users className="w-3.5 h-3.5" style={{ color: "#06B6D4" }} />
                <h3 className="text-xs font-mono font-bold text-foreground flex-1">Team Workspace</h3>
                {assigningTeam && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
              </div>
              <div className="p-3">
                {userTeams.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground font-mono opacity-60 text-center py-2">
                    No teams yet.{" "}
                    <a href="/app/teams" className="underline hover:text-foreground">Create one</a>
                  </p>
                ) : (
                  <div className="space-y-1">
                    {currentTeamId && (
                      <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg text-[10px] font-mono"
                        style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", color: "#06B6D4" }}
                      >
                        <Shield className="w-3 h-3 shrink-0" />
                        <span className="flex-1 truncate">
                          {userTeams.find(t => t.id === currentTeamId)?.name ?? "Team"}
                        </span>
                        <button
                          onClick={() => handleAssignTeam(null)}
                          className="opacity-60 hover:opacity-100 transition-opacity"
                          title="Remove from team"
                        >✕</button>
                      </div>
                    )}
                    <p className="text-[9px] text-muted-foreground font-mono mb-1.5 opacity-60">
                      {currentTeamId ? "MOVE TO DIFFERENT TEAM" : "ASSIGN TO TEAM"}
                    </p>
                    {userTeams
                      .filter(t => t.id !== currentTeamId && t.role !== "viewer")
                      .map(team => (
                        <button
                          key={team.id}
                          onClick={() => handleAssignTeam(team.id)}
                          disabled={assigningTeam}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors group disabled:opacity-50"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(6,182,212,0.08)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                        >
                          <Shield className="w-3 h-3 text-muted-foreground group-hover:text-cyan-400 shrink-0" />
                          <span className="text-[10px] font-mono truncate">{team.name}</span>
                        </button>
                      ))
                    }
                    {userTeams.filter(t => t.id !== currentTeamId && t.role !== "viewer").length === 0 && !currentTeamId && (
                      <p className="text-[10px] text-muted-foreground font-mono opacity-40 text-center py-1">
                        You need editor+ role to assign specs.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {isGitHub && (
              <Card className="border-border bg-card p-4">
                <h3 className="text-xs font-mono text-muted-foreground mb-3">SOURCE</h3>
                <a
                  href={spec.inputValue}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-start gap-2 break-all"
                >
                  <Github className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {spec.inputValue}
                </a>
                {spec.lastSyncedAt && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3" />
                    Last synced {formatDistanceToNow(new Date(spec.lastSyncedAt))} ago
                  </p>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Scaffold slide-over panel */}
      <AnimatePresence>
        {showScaffold && spec && (
          <SpecScaffold
            specId={spec.id}
            specTitle={spec.title}
            onClose={() => setShowScaffold(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
