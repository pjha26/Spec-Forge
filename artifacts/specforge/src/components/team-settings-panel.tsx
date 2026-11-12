/**
 * Team Settings panel — custom AI system prompt and email digests.
 * Only visible to team owners.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Check, Mail, Bell, BellOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  teamId: number;
  initialPrompt: string | null;
  initialNotifyEmail?: string | null;
  initialDigestFrequency?: "weekly" | "daily" | "off";
}

export function TeamSettingsPanel({ teamId, initialPrompt, initialNotifyEmail, initialDigestFrequency }: Props) {
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
