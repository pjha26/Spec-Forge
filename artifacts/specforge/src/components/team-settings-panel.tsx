/**
 * Team Settings panel — custom system prompt.
 * Only visible to team owners.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  teamId: number;
  initialPrompt: string | null;
}

export function TeamSettingsPanel({ teamId, initialPrompt }: Props) {
  const { toast } = useToast();

  // ── Custom system prompt ────────────────────────────────────────────────
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);

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
    </div>
  );
}
