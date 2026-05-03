import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, GitBranch, Hash, Webhook, Plus, Trash2, CheckCircle2,
  AlertCircle, Loader2, Eye, EyeOff, TestTube2, RefreshCw,
  ExternalLink, Settings, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type Tab = "linear" | "slack" | "webhooks";
type OutboundHook = {
  id: number; name: string; eventType: string; url: string;
  secret: string | null; enabled: boolean;
  lastTriggeredAt: string | null; lastStatus: number | null;
  createdAt: string;
};

const EVENTS = [
  { value: "spec.generated",      label: "Spec Generated",     desc: "Fires when a spec is successfully generated" },
  { value: "spec.shared",         label: "Spec Shared",        desc: "Fires when a share link is created" },
  { value: "spec.health_declined",label: "Health Declined",    desc: "Fires when a spec's health score drops" },
  { value: "team.member_joined",  label: "Team Member Joined", desc: "Fires when someone joins a team" },
];

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "linear",   label: "Linear / Jira",   icon: GitBranch },
  { id: "slack",    label: "Slack",            icon: Hash },
  { id: "webhooks", label: "Zapier / Webhooks",icon: Webhook },
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

  // Outbound webhooks
  const [hooks, setHooks] = useState<OutboundHook[]>([]);
  const [hooksLoading, setHooksLoading] = useState(false);
  const [newHookName, setNewHookName] = useState("");
  const [newHookEvent, setNewHookEvent] = useState("spec.generated");
  const [newHookUrl, setNewHookUrl] = useState("");
  const [addingHook, setAddingHook] = useState(false);

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

  const loadHooks = useCallback(async () => {
    setHooksLoading(true);
    try {
      const res = await fetch("/api/integrations/webhooks");
      if (res.ok) {
        const data = await res.json();
        setHooks(data.webhooks ?? []);
      }
    } catch { /* ignore */ }
    finally { setHooksLoading(false); }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { if (tab === "webhooks") loadHooks(); }, [tab, loadHooks]);

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

  const addHook = async () => {
    if (!newHookName || !newHookUrl) return;
    setAddingHook(true);
    try {
      const res = await fetch("/api/integrations/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newHookName, eventType: newHookEvent, url: newHookUrl }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewHookName(""); setNewHookUrl(""); setNewHookEvent("spec.generated");
      await loadHooks();
      toast({ title: "Webhook registered!" });
    } catch (err: any) {
      toast({ title: err.message ?? "Failed to add webhook", variant: "destructive" });
    } finally { setAddingHook(false); }
  };

  const deleteHook = async (id: number) => {
    await fetch(`/api/integrations/webhooks/${id}`, { method: "DELETE" });
    setHooks(prev => prev.filter(h => h.id !== id));
    toast({ title: "Webhook deleted" });
  };

  const testHook = async (id: number) => {
    await fetch(`/api/integrations/webhooks/${id}/test`, { method: "POST" });
    toast({ title: "Test payload sent!" });
  };

  const toggleHook = async (id: number, enabled: boolean) => {
    await fetch(`/api/integrations/webhooks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setHooks(prev => prev.map(h => h.id === id ? { ...h, enabled } : h));
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.div className="mb-8" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
              <Zap className="w-5 h-5" style={{ color: "hsl(263,90%,70%)" }} />
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
                  background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)",
                  color: "hsl(263,90%,74%)",
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

            {/* ─── ZAPIER / WEBHOOKS ─── */}
            {tab === "webhooks" && (
              <motion.div key="webhooks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                {/* Add webhook */}
                <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5" /> New Webhook
                  </p>
                  <Input
                    placeholder="Webhook name — e.g. Zapier Spec Alert"
                    value={newHookName}
                    onChange={e => setNewHookName(e.target.value)}
                    className="font-mono text-xs"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                  <select
                    value={newHookEvent}
                    onChange={e => setNewHookEvent(e.target.value)}
                    className="w-full text-xs font-mono rounded-md px-3 py-2 h-9"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "white" }}
                  >
                    {EVENTS.map(ev => <option key={ev.value} value={ev.value}>{ev.label} — {ev.desc}</option>)}
                  </select>
                  <Input
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    value={newHookUrl}
                    onChange={e => setNewHookUrl(e.target.value)}
                    className="font-mono text-xs"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                  <Button size="sm" className="w-full font-mono text-xs" onClick={addHook} disabled={addingHook || !newHookName || !newHookUrl}>
                    {addingHook ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Plus className="w-3 h-3 mr-2" />}
                    Register Webhook
                  </Button>
                </div>

                {/* Webhook list */}
                {hooksLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                ) : hooks.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <Webhook className="w-7 h-7 mx-auto opacity-20" />
                    <p className="text-sm text-muted-foreground font-mono">No webhooks registered yet</p>
                    <p className="text-xs text-muted-foreground/50">Zapier, Make.com, or any HTTP endpoint works</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {hooks.map(hook => {
                      const ev = EVENTS.find(e => e.value === hook.eventType);
                      const ok = hook.lastStatus && hook.lastStatus >= 200 && hook.lastStatus < 300;
                      return (
                        <div key={hook.id} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold">{hook.name}</p>
                                <button onClick={() => toggleHook(hook.id, !hook.enabled)} className="shrink-0">
                                  <Badge variant="outline" className="text-[9px] font-mono cursor-pointer"
                                    style={hook.enabled ? { color: "#10B981", borderColor: "rgba(16,185,129,0.4)", background: "rgba(16,185,129,0.1)" } : {}}>
                                    {hook.enabled ? "Active" : "Paused"}
                                  </Badge>
                                </button>
                              </div>
                              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{ev?.label ?? hook.eventType}</p>
                              <p className="text-[10px] font-mono text-muted-foreground/50 truncate max-w-xs mt-0.5">{hook.url}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {hook.lastStatus !== null && (
                                <span className="text-[9px] font-mono flex items-center gap-1" style={{ color: ok ? "#10B981" : "#EF4444" }}>
                                  {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                  {hook.lastStatus}
                                </span>
                              )}
                              <button onClick={() => testHook(hook.id)} className="p-1.5 rounded hover:bg-white/5 text-muted-foreground hover:text-white transition-colors" title="Send test">
                                <TestTube2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteHook(hook.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          {hook.secret && (
                            <div className="flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                              <Shield className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                              <code className="text-[9px] font-mono text-muted-foreground/50 truncate">HMAC: sha256={hook.secret.slice(0, 8)}••••</code>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="rounded-xl p-4 text-xs font-mono" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-muted-foreground/70 font-semibold mb-2">Payload format</p>
                  <pre className="text-muted-foreground/50 text-[10px] overflow-x-auto">{`{
  "event": "spec.generated",
  "timestamp": "2025-01-01T00:00:00Z",
  "data": { "id": 1, "title": "My Spec", ... }
}`}</pre>
                  <p className="text-muted-foreground/40 mt-2">All requests include <code className="text-primary/70">X-SpecForge-Signature</code> (HMAC-SHA256) for verification.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
