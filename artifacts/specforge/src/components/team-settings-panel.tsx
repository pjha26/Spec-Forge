/**
 * Team Settings panel — custom AI system prompt + SSO configuration.
 * Only visible to team owners.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings, Sparkles, Loader2, Check, Key, AlertCircle,
  ExternalLink, ChevronDown, ChevronUp, Shield, Mail, Bell, BellOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  teamId: number;
  initialPrompt: string | null;
  ssoEnabled: boolean;
  initialNotifyEmail?: string | null;
  initialDigestFrequency?: "weekly" | "daily" | "off";
}

export function TeamSettingsPanel({ teamId, initialPrompt, ssoEnabled, initialNotifyEmail, initialDigestFrequency }: Props) {
  const { toast } = useToast();

  // ── Custom system prompt ────────────────────────────────────────────────
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);

  // ── Digest email ────────────────────────────────────────────────────────
  const [notifyEmail, setNotifyEmail] = useState(initialNotifyEmail ?? "");
  const [digestFrequency, setDigestFrequency] = useState<"weekly" | "daily" | "off">(initialDigestFrequency ?? "off");
  const [savingDigest, setSavingDigest] = useState(false);
  const [digestSaved, setDigestSaved] = useState(false);

  const handleSaveDigest = async () => {
    if (digestFrequency !== "off" && !notifyEmail.trim()) {
      toast({ title: "Email address required to enable digest", variant: "destructive" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (notifyEmail.trim() && !emailRegex.test(notifyEmail.trim())) {
      toast({ title: "Invalid email address", variant: "destructive" });
      return;
    }
    setSavingDigest(true);
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifyEmail: notifyEmail.trim() || null,
          digestFrequency,
        }),
      });
      if (!res.ok) throw new Error();
      setDigestSaved(true);
      setTimeout(() => setDigestSaved(false), 2000);
      toast({
        title: digestFrequency === "off" ? "Digest disabled" : `${digestFrequency === "daily" ? "Daily" : "Weekly"} digest enabled`,
        description: digestFrequency !== "off" ? `Reports will be sent to ${notifyEmail.trim()}` : undefined,
      });
    } catch {
      toast({ title: "Failed to save digest settings", variant: "destructive" });
    } finally {
      setSavingDigest(false);
    }
  };

  const handleSavePrompt = async () => {
    setSavingPrompt(true);
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customSystemPrompt: prompt }),
      });
      if (!res.ok) throw new Error();
      setPromptSaved(true);
      setTimeout(() => setPromptSaved(false), 2000);
      toast({ title: "Team prompt saved — will be used in all future spec generations." });
    } catch {
      toast({ title: "Failed to save prompt", variant: "destructive" });
    } finally {
      setSavingPrompt(false);
    }
  };

  // ── SSO Configuration ───────────────────────────────────────────────────
  const [showSso, setShowSso] = useState(false);
  const [entityId, setEntityId] = useState("");
  const [ssoUrl, setSsoUrl] = useState("");
  const [certificate, setCertificate] = useState("");
  const [ssoEnabledState, setSsoEnabledState] = useState(ssoEnabled);
  const [loadingSso, setLoadingSso] = useState(false);
  const [ssoConfig, setSsoConfig] = useState<{
    hasCertificate: boolean; entityId: string; ssoUrl: string; spEntityId: string; acsUrl?: string;
  } | null>(null);
  const [loadedSso, setLoadedSso] = useState(false);

  const loadSso = async () => {
    if (loadedSso) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/sso`);
      const data = await res.json();
      if (data.config) {
        setSsoConfig(data.config);
        setEntityId(data.config.entityId);
        setSsoUrl(data.config.ssoUrl);
        setSsoEnabledState(data.config.enabled);
      }
    } catch {} finally { setLoadedSso(true); }
  };

  const handleToggleSso = async () => {
    await loadSso();
    setShowSso(v => !v);
  };

  const handleSaveSso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityId.trim() || !ssoUrl.trim() || !certificate.trim()) {
      toast({ title: "All SSO fields are required", variant: "destructive" }); return;
    }
    setLoadingSso(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/sso`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId, ssoUrl, certificate, enabled: ssoEnabledState }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSsoConfig({ hasCertificate: true, entityId, ssoUrl, spEntityId: data.spEntityId, acsUrl: data.acsUrl });
      toast({ title: "SSO configuration saved!", description: `ACS URL: ${data.acsUrl}` });
    } catch (err: any) {
      toast({ title: err.message ?? "Failed to save SSO", variant: "destructive" });
    } finally { setLoadingSso(false); }
  };

  const handleDeleteSso = async () => {
    if (!confirm("Remove SSO configuration? Members will fall back to Replit Auth.")) return;
    try {
      await fetch(`/api/teams/${teamId}/sso`, { method: "DELETE" });
      setSsoConfig(null); setSsoEnabledState(false); setEntityId(""); setSsoUrl(""); setCertificate("");
      toast({ title: "SSO configuration removed" });
    } catch {
      toast({ title: "Failed to remove SSO", variant: "destructive" });
    }
  };

  const publicUrl = `${window.location.origin}/api`;

  return (
    <div className="space-y-6">

      {/* ── Custom AI System Prompt ─────────────────────────────────────── */}
      <div className="rounded-xl p-4 space-y-3"
        style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.18)" }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: "hsl(263,90%,70%)" }} />
          <h3 className="text-xs font-mono font-bold" style={{ color: "hsl(263,90%,74%)" }}>
            Custom AI System Prompt
          </h3>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          This prompt is prepended to every spec generation for this team. Use it to enforce conventions, naming standards, required sections, or any rule your team follows.
        </p>

        {/* Example hint */}
        <div className="rounded-lg px-3 py-2 text-[10px] font-mono text-muted-foreground leading-relaxed"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          Example: "Always use our internal API naming conventions (camelCase routes). Always include a Rollback Plan section. Never recommend third-party auth providers — we use our own SSO."
        </div>

        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Write your team's AI conventions here…"
          rows={7}
          className="w-full rounded-lg px-3 py-2.5 text-xs font-mono outline-none resize-none leading-relaxed"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        />

        <div className="flex items-center justify-between">
          <p className="text-[9px] font-mono text-muted-foreground opacity-50">
            {prompt.length} chars · injected before every generation for team specs
          </p>
          <motion.button
            onClick={handleSavePrompt}
            disabled={savingPrompt}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold disabled:opacity-50"
            style={{ background: "rgba(139,92,246,0.25)", border: "1px solid rgba(139,92,246,0.35)", color: "white" }}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          >
            {savingPrompt
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : promptSaved
                ? <Check className="w-3 h-3 text-green-400" />
                : <Check className="w-3 h-3" />
            }
            {promptSaved ? "Saved!" : "Save Prompt"}
          </motion.button>
        </div>
      </div>

      {/* ── SSO / SAML ───────────────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.18)" }}
      >
        <button
          className="w-full flex items-center justify-between px-4 py-3"
          onClick={handleToggleSso}
        >
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <div className="text-left">
              <h3 className="text-xs font-mono font-bold text-amber-400">SAML 2.0 Single Sign-On</h3>
              <p className="text-[9px] text-muted-foreground font-mono">
                {ssoEnabledState ? "SSO enabled — members can log in via your IDP" : "Not configured"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {ssoEnabledState && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold"
                style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)" }}
              >ACTIVE</span>
            )}
            {showSso ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
        </button>

        {showSso && (
          <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: "rgba(245,158,11,0.15)" }}>
            <div className="pt-3 space-y-1">
              <p className="text-[10px] text-muted-foreground">
                Configure SAML 2.0 SSO so team members can authenticate with Okta, Azure AD, Google Workspace, or any SAML IDP.
              </p>
              <a href="https://en.wikipedia.org/wiki/Security_Assertion_Markup_Language" target="_blank" rel="noopener"
                className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
              >
                Learn about SAML 2.0 <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            {/* SP Metadata info */}
            {ssoConfig && (
              <div className="rounded-lg px-3 py-2.5 space-y-1.5"
                style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
              >
                <p className="text-[10px] font-mono font-bold text-emerald-400">Configure these in your IDP:</p>
                <div className="space-y-1">
                  {[
                    { label: "ACS URL", value: ssoConfig.acsUrl ?? `${publicUrl}/sso/${teamId}/callback` },
                    { label: "SP Entity ID", value: ssoConfig.spEntityId ?? `${publicUrl}/sso/${teamId}/metadata` },
                    { label: "Metadata URL", value: `${publicUrl}/sso/${teamId}/metadata` },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-2">
                      <span className="text-[9px] font-mono text-muted-foreground w-24 shrink-0">{item.label}</span>
                      <span className="text-[9px] font-mono text-emerald-300 break-all">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SSO Form */}
            <form onSubmit={handleSaveSso} className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sso-enabled"
                  checked={ssoEnabledState}
                  onChange={e => setSsoEnabledState(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="sso-enabled" className="text-[10px] font-mono text-muted-foreground">
                  Enable SSO for this team
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-muted-foreground">IDP Entity ID</label>
                <input
                  value={entityId}
                  onChange={e => setEntityId(e.target.value)}
                  placeholder="https://your-idp.com/issuer"
                  className="w-full rounded-lg px-3 py-2 text-xs font-mono outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-muted-foreground">SSO URL (IDP login endpoint)</label>
                <input
                  value={ssoUrl}
                  onChange={e => setSsoUrl(e.target.value)}
                  placeholder="https://your-idp.com/sso/saml"
                  className="w-full rounded-lg px-3 py-2 text-xs font-mono outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-muted-foreground">IDP X.509 Certificate</label>
                <textarea
                  value={certificate}
                  onChange={e => setCertificate(e.target.value)}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;MIIBkDCB+...&#10;-----END CERTIFICATE-----"
                  rows={5}
                  className="w-full rounded-lg px-3 py-2 text-[10px] font-mono outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>

              <div className="flex gap-2 justify-between pt-1">
                {ssoConfig && (
                  <button type="button" onClick={handleDeleteSso}
                    className="text-[10px] font-mono text-red-400 hover:text-red-300 px-2 py-1"
                  >
                    Remove SSO
                  </button>
                )}
                <motion.button
                  type="submit"
                  disabled={loadingSso}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold disabled:opacity-50"
                  style={{ background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.35)", color: "#F59E0B" }}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                >
                  {loadingSso ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                  Save SSO Config
                </motion.button>
              </div>
            </form>

            <div className="flex items-start gap-1.5 p-2.5 rounded-lg"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}
            >
              <AlertCircle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[9px] font-mono text-amber-200 opacity-70 leading-relaxed">
                After saving, copy the ACS URL and SP Entity ID into your IDP (Okta, Azure AD, etc). SAML assertion validation requires node-saml — see SAML_SETUP.md.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Weekly/Daily Digest Email ────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.18)" }}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <Mail className="w-4 h-4 text-emerald-400" />
          <div className="flex-1">
            <h3 className="text-xs font-mono font-bold text-emerald-400">Spec Health Digest</h3>
            <p className="text-[9px] font-mono text-muted-foreground mt-0.5">
              {digestFrequency === "off"
                ? "Email digest disabled"
                : `${digestFrequency === "daily" ? "Daily" : "Weekly (Sunday)"} digest → ${notifyEmail || "no email set"}`}
            </p>
          </div>
          {digestFrequency !== "off" && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold"
              style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)" }}
            >ACTIVE</span>
          )}
        </div>

        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "rgba(16,185,129,0.12)" }}>
          <p className="text-[10px] text-muted-foreground leading-relaxed pt-3">
            Receive a formatted email with spec alignment scores, drift items, and open conflicts for every spec in this team.
            Emails are sent by the server — requires SMTP to be configured by the admin.
          </p>

          {/* Frequency selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-muted-foreground">Frequency</label>
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {([
                { value: "off" as const,    label: "Off",    Icon: BellOff },
                { value: "weekly" as const,  label: "Weekly", Icon: Bell   },
                { value: "daily" as const,   label: "Daily",  Icon: Bell   },
              ]).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => setDigestFrequency(value)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-mono rounded-md transition-all"
                  style={digestFrequency === value ? {
                    background: "rgba(16,185,129,0.2)",
                    color: "#34d399",
                    border: "1px solid rgba(16,185,129,0.3)",
                  } : {
                    color: "hsl(var(--muted-foreground))",
                    border: "1px solid transparent",
                  }}
                >
                  <Icon className="w-3 h-3" /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-muted-foreground">Recipient Email</label>
            <input
              value={notifyEmail}
              onChange={e => setNotifyEmail(e.target.value)}
              placeholder="team@yourcompany.com"
              type="email"
              className="w-full rounded-lg px-3 py-2 text-xs font-mono outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
            <p className="text-[9px] font-mono text-muted-foreground opacity-60">
              Digest includes all team spec health scores, drift items, and open conflicts.
            </p>
          </div>

          <div className="flex justify-end">
            <motion.button
              onClick={handleSaveDigest}
              disabled={savingDigest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold disabled:opacity-50"
              style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.3)", color: "#10B981" }}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            >
              {savingDigest
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : digestSaved
                  ? <Check className="w-3 h-3" />
                  : <Mail className="w-3 h-3" />
              }
              {digestSaved ? "Saved!" : "Save Digest Settings"}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
