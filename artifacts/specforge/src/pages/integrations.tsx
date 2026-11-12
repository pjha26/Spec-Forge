import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, GitBranch, Hash, CheckCircle2,
  AlertCircle, Loader2, Eye, EyeOff, TestTube2, RefreshCw,
  ExternalLink, Settings, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type Tab = "linear" | "slack";
const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "linear",   label: "Linear / Jira",   icon: GitBranch },
  { id: "slack",    label: "Slack",            icon: Hash },
];

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className="flex items-center gap-1 text-[10px] font-mono">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: ok ? "#10B981" : "#6B7280" }} />
      {ok ? "Connected" : "Not configured"}
    </span>
  );
}

export default function IntegrationsPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("linear");
  const [settings, setSettings] = useState<Record<string, string | null | boolean>>({});
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linearTeams, setLinearTeams] = useState<{ id: string; name: string }[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [slackTestLoading, setSlackTestLoading] = useState(false);
  const [showLinearKey, setShowLinearKey] = useState(false);
  const [showJiraKey, setShowJiraKey] = useState(false);

  // Form fields
  const [linearApiKey, setLinearApiKey] = useState("");
  const [linearTeamId, setLinearTeamId] = useState("");
  const [jiraApiKey, setJiraApiKey] = useState("");
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");
  const [jiraProjectKey, setJiraProjectKey] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/integrations/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        if (data.linearTeamId) setLinearTeamId(data.linearTeamId);
        if (data.jiraBaseUrl) setJiraBaseUrl(data.jiraBaseUrl);
        if (data.jiraProjectKey) setJiraProjectKey(data.jiraProjectKey);
        if (data.slackWebhookUrl) setSlackWebhookUrl(data.slackWebhookUrl);
      }
    } catch { /* ignore */ }
    finally { setSettingsLoading(false); }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const saveSettings = async (updates: Record<string, string | null>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      await loadSettings();
      toast({ title: "Settings saved!" });
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const fetchLinearTeams = async () => {
    if (linearApiKey.trim().length < 8) {
      toast({ title: "Enter your Linear API key first", variant: "destructive" });
      return;
    }
    setTeamsLoading(true);
    try {
      await saveSettings({ linearApiKey: linearApiKey || null });
      const res = await fetch("/api/specs/linear-teams");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLinearTeams(data.teams ?? []);
      if (data.teams?.length === 0) toast({ title: "No teams found — check your API key" });
    } catch {
      toast({ title: "Failed to fetch teams — check your API key", variant: "destructive" });
    } finally { setTeamsLoading(false); }
  };

  const testSlack = async () => {
    if (!slackWebhookUrl) return;
    setSlackTestLoading(true);
    try {
      const res = await fetch("/api/integrations/slack/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: slackWebhookUrl }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Test message sent to Slack!" });
    } catch (err: any) {
      toast({ title: err.message ?? "Failed to send test message", variant: "destructive" });
    } finally { setSlackTestLoading(false); }
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.div className="mb-8" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(var(--primary-rgb),0.12)", border: "1px solid rgba(var(--primary-rgb),0.25)" }}>
              <Zap className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Integrations</h1>
              <p className="text-xs text-muted-foreground">Connect SpecForge to your workflow tools</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-150"
                style={tab === t.id ? {
                  background: "rgba(var(--primary-rgb),0.15)", border: "1px solid rgba(var(--primary-rgb),0.35)",
                  color: "hsl(var(--primary))",
                } : { color: "hsl(var(--muted-foreground))" }}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        {settingsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* ─── LINEAR / JIRA ─── */}
            {tab === "linear" && (
              <motion.div key="linear" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                {/* Linear */}
                <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(94,106,210,0.25)" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(94,106,210,0.15)", border: "1px solid rgba(94,106,210,0.3)" }}>
                        <GitBranch className="w-4 h-4" style={{ color: "#5E6AD2" }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Linear</p>
                        <StatusDot ok={!!settings.linearApiKeySet} />
                      </div>
                    </div>
                    <a href="https://linear.app/settings/api" target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-muted-foreground/50 hover:text-primary flex items-center gap-1">Get API key <ExternalLink className="w-3 h-3" /></a>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <Input
                        type={showLinearKey ? "text" : "password"}
                        placeholder={settings.linearApiKeySet ? "API key saved (enter new to replace)" : "lin_api_xxxxxxxxxxxx"}
                        value={linearApiKey}
                        onChange={e => setLinearApiKey(e.target.value)}
                        className="font-mono text-xs pr-10"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      />
                      <button onClick={() => setShowLinearKey(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                        {showLinearKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="font-mono text-xs flex-1" onClick={fetchLinearTeams} disabled={teamsLoading}>
                        {teamsLoading ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-2" />}
                        {linearTeams.length > 0 ? "Refresh teams" : "Load teams"}
                      </Button>
                      {linearTeams.length > 0 && (
                        <select
                          value={linearTeamId}
                          onChange={e => setLinearTeamId(e.target.value)}
                          className="flex-1 text-xs font-mono rounded-md px-2"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "white" }}
                        >
                          <option value="">Select team…</option>
                          {linearTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      )}
                    </div>

                    <Button size="sm" className="font-mono text-xs w-full" disabled={saving}
                      onClick={() => saveSettings({ linearApiKey: linearApiKey || null, linearTeamId: linearTeamId || null })}>
                      {saving ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-2" />}
                      Save Linear Settings
                    </Button>
                  </div>
                </div>

                {/* Jira */}
                <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,82,204,0.25)" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,82,204,0.15)", border: "1px solid rgba(0,82,204,0.3)" }}>
                        <Settings className="w-4 h-4" style={{ color: "#0052CC" }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Jira</p>
                        <StatusDot ok={!!settings.jiraApiKeySet} />
                      </div>
                    </div>
                    <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-muted-foreground/50 hover:text-primary flex items-center gap-1">Get API token <ExternalLink className="w-3 h-3" /></a>
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        type={showJiraKey ? "text" : "password"}
                        placeholder={settings.jiraApiKeySet ? "API token saved (enter new to replace)" : "Jira API token"}
                        value={jiraApiKey}
                        onChange={e => setJiraApiKey(e.target.value)}
                        className="font-mono text-xs pr-10"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      />
                      <button onClick={() => setShowJiraKey(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                        {showJiraKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <Input
                      placeholder="Base URL — https://yourteam.atlassian.net"
                      value={jiraBaseUrl}
                      onChange={e => setJiraBaseUrl(e.target.value)}
                      className="font-mono text-xs"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    />
                    <Input
                      placeholder="Project key — e.g. ENG"
                      value={jiraProjectKey}
                      onChange={e => setJiraProjectKey(e.target.value)}
                      className="font-mono text-xs"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    />
                    <Button size="sm" className="font-mono text-xs w-full" disabled={saving}
                      onClick={() => saveSettings({ jiraApiKey: jiraApiKey || null, jiraBaseUrl: jiraBaseUrl || null, jiraProjectKey: jiraProjectKey || null })}>
                      {saving ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-2" />}
                      Save Jira Settings
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground/50 font-mono text-center">Once configured, open any spec and click "Issue Sync" to push tasks to Linear or Jira</p>
              </motion.div>
            )}

            {/* ─── SLACK ─── */}
            {tab === "slack" && (
              <motion.div key="slack" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(74,144,226,0.2)" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(74,144,226,0.15)", border: "1px solid rgba(74,144,226,0.3)" }}>
                      <Hash className="w-4 h-4" style={{ color: "#4A90E2" }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Slack Notifications</p>
                      <StatusDot ok={!!settings.slackWebhookUrl} />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg text-xs font-mono space-y-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-muted-foreground/80 font-semibold">How to get your Slack webhook URL:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground/60 pl-1">
                      <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">api.slack.com/apps</a></li>
                      <li>Create an app → Enable Incoming Webhooks</li>
                      <li>Click "Add New Webhook to Workspace"</li>
                      <li>Select a channel → Copy the webhook URL</li>
                    </ol>
                  </div>

                  <Input
                    placeholder="https://hooks.slack.com/services/T00/B00/xxxx"
                    value={slackWebhookUrl}
                    onChange={e => setSlackWebhookUrl(e.target.value)}
                    className="font-mono text-xs"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />

                  <div className="flex gap-2">
                    <Button size="sm" className="font-mono text-xs flex-1" disabled={saving}
                      onClick={() => saveSettings({ slackWebhookUrl: slackWebhookUrl || null })}>
                      {saving ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-2" />}
                      Save
                    </Button>
                    <Button size="sm" variant="outline" className="font-mono text-xs" disabled={slackTestLoading || !slackWebhookUrl} onClick={testSlack}>
                      {slackTestLoading ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <TestTube2 className="w-3 h-3 mr-2" />}
                      Test
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl p-4" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
                  <p className="text-xs font-mono text-emerald-400 font-semibold mb-2">You will receive Slack messages when:</p>
                  <ul className="space-y-1 text-xs text-muted-foreground font-mono">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> A spec is successfully generated</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> A spec's health score declines</li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
