import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Brain, Cpu, Globe, Layers, StickyNote, Loader2, Check, Palette, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { THEMES, FONT_OPTIONS, SYNTAX_THEMES, type ThemeId } from "@/lib/theme";

const SECTION_OPTIONS = [
  "Security Considerations",
  "Performance & Caching",
  "Monitoring & Observability",
  "CI/CD Pipeline",
  "Cost Estimation",
  "Disaster Recovery",
  "Accessibility",
  "Internationalization",
  "Testing Strategy",
];

const DOMAIN_OPTIONS = ["Fintech", "Healthcare", "E-commerce", "SaaS", "Gaming", "Enterprise", "Consumer App", "Developer Tools", "Data & Analytics"];

interface Props {
  onClose: () => void;
}

export function PreferencesModal({ onClose }: Props) {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [preferredStack, setPreferredStack] = useState("");
  const [domain, setDomain] = useState("");
  const [alwaysIncludeSections, setAlwaysIncludeSections] = useState<string[]>([]);
  const [preferredModel, setPreferredModel] = useState("");
  const [defaultSpecType, setDefaultSpecType] = useState("");
  const [extraContext, setExtraContext] = useState("");

  useEffect(() => {
    fetch("/api/preferences")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setPreferredStack(d.preferredStack ?? "");
          setDomain(d.domain ?? "");
          setAlwaysIncludeSections(d.alwaysIncludeSections ?? []);
          setPreferredModel(d.preferredModel ?? "");
          setDefaultSpecType(d.defaultSpecType ?? "");
          setExtraContext(d.extraContext ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleSection = (s: string) => {
    setAlwaysIncludeSections(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredStack, domain, alwaysIncludeSections, preferredModel, defaultSpecType, extraContext }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast({ title: "Preferences saved!", description: "All future specs will apply your preferences automatically." });
    } catch {
      toast({ title: "Failed to save preferences", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl flex flex-col"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid rgba(var(--primary-rgb),0.2)",
          boxShadow: "0 0 60px rgba(var(--primary-rgb),0.1), 0 24px 48px rgba(0,0,0,0.6)",
        }}
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
      >
        <div className="sticky top-0 z-10 px-6 pt-6 pb-4 flex items-start justify-between"
          style={{ background: "rgba(10,10,18,0.98)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(var(--primary-rgb),0.12)", border: "1px solid rgba(var(--primary-rgb),0.25)" }}
            >
              <Brain className="w-4.5 h-4.5" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono" style={{ color: "hsl(var(--primary))" }}>AI Memory</h2>
              <p className="text-xs text-muted-foreground">Applied automatically to every spec you generate</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="px-6 py-5 space-y-6">

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">
                <Cpu className="w-3 h-3" /> Preferred Tech Stack
              </label>
              <Input
                placeholder="e.g. TypeScript, PostgreSQL, Next.js, Docker"
                value={preferredStack}
                onChange={e => setPreferredStack(e.target.value)}
                className="font-mono text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
              <p className="text-[10px] text-muted-foreground/60">SpecForge will always recommend this stack in generated specs.</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">
                <Globe className="w-3 h-3" /> Working Domain
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DOMAIN_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDomain(domain === d ? "" : d)}
                    className="px-2.5 py-1 rounded-md text-xs font-mono transition-all"
                    style={domain === d ? {
                      background: "rgba(var(--primary-rgb),0.2)",
                      border: "1px solid rgba(var(--primary-rgb),0.4)",
                      color: "hsl(var(--primary))",
                    } : {
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "hsl(var(--muted-foreground))",
                    }}
                  >{d}</button>
                ))}
              </div>
              <Input
                placeholder="Or type your domain…"
                value={DOMAIN_OPTIONS.includes(domain) ? "" : domain}
                onChange={e => setDomain(e.target.value)}
                className="font-mono text-xs mt-1"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">
                <Layers className="w-3 h-3" /> Always Include Sections
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SECTION_OPTIONS.map(s => {
                  const active = alwaysIncludeSections.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleSection(s)}
                      className="px-2.5 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1"
                      style={active ? {
                        background: "rgba(var(--primary-rgb),0.2)",
                        border: "1px solid rgba(var(--primary-rgb),0.4)",
                        color: "hsl(var(--primary))",
                      } : {
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "hsl(var(--muted-foreground))",
                      }}
                    >
                      {active && <Check className="w-2.5 h-2.5" />}
                      {s}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground/60">These sections will always be appended to every generated spec.</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">
                <StickyNote className="w-3 h-3" /> Extra Context
              </label>
              <Textarea
                placeholder="e.g. 'I always work in fintech startups with strict compliance requirements. We use a microservices architecture on AWS. Always assume GDPR compliance is required.'"
                value={extraContext}
                onChange={e => setExtraContext(e.target.value)}
                className="text-sm resize-none min-h-[80px]"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
              <p className="text-[10px] text-muted-foreground/60">Free-form context injected into every generation. The more specific, the better the output.</p>
            </div>

            {/* ── Theme Engine ── */}
            <div className="space-y-4 pt-2 border-t border-border/40">
              <label className="flex items-center gap-2 text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">
                <Palette className="w-3 h-3" /> Appearance
              </label>

              {/* Theme picker */}
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-muted-foreground">Color Theme</p>
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map(t => {
                    const active = theme.themeId === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTheme({ ...theme, themeId: t.id as ThemeId })}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono transition-all text-left"
                        style={active ? {
                          background: `${t.swatches[1]}18`,
                          border: `1px solid ${t.swatches[1]}60`,
                          color: t.swatches[1],
                        } : {
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "hsl(var(--muted-foreground))",
                        }}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${t.swatches[1]}, ${t.swatches[2]})`,
                            boxShadow: active ? `0 0 6px ${t.swatches[1]}80` : "none",
                          }}
                        />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font */}
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-muted-foreground flex items-center gap-1"><Type className="w-3 h-3" /> Font</p>
                <div className="flex items-center gap-2">
                  {FONT_OPTIONS.map(f => (
                    <button
                      key={f.value}
                      onClick={() => setTheme({ ...theme, font: f.value })}
                      className="px-3 py-1.5 rounded-lg text-xs transition-all"
                      style={{
                        fontFamily: f.css,
                        ...(theme.font === f.value ? {
                          background: "rgba(var(--primary-rgb),0.15)",
                          border: "1px solid rgba(var(--primary-rgb),0.4)",
                          color: "hsl(var(--primary))",
                        } : {
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "hsl(var(--muted-foreground))",
                        }),
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Syntax theme */}
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-muted-foreground">Code Block Theme</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {SYNTAX_THEMES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setTheme({ ...theme, syntaxTheme: s.value })}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all"
                      style={theme.syntaxTheme === s.value ? {
                        background: "rgba(var(--primary-rgb),0.15)",
                        border: "1px solid rgba(var(--primary-rgb),0.4)",
                        color: "hsl(var(--primary))",
                      } : {
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "hsl(var(--muted-foreground))",
                      }}
                    >
                      <span className="w-3 h-3 rounded-sm" style={{ background: s.preview }} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        <div className="sticky bottom-0 px-6 py-4 flex justify-end gap-3"
          style={{ background: "rgba(10,10,18,0.98)", borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Button variant="ghost" size="sm" onClick={onClose} className="font-mono text-xs">Cancel</Button>
          <motion.button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold disabled:opacity-50"
            style={{
              background: saved
                ? "rgba(16,185,129,0.2)"
                : "linear-gradient(135deg, rgba(var(--primary-rgb),0.85), rgba(var(--primary-rgb),0.6))",
              border: saved ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(var(--primary-rgb),0.5)",
              color: saved ? "#10B981" : "white",
            }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
            {saved ? "Saved!" : saving ? "Saving…" : "Save Preferences"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
