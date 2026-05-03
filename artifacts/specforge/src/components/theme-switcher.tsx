/**
 * ThemeSwitcher — floating theme palette picker.
 * Shows 5 theme cards (4 dark + 1 light) in a popover.
 * Placed in the navbar + sidebar footer.
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Moon, Sun, Check } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { THEMES, type ThemeId } from "@/lib/theme";

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentDef = THEMES.find(t => t.id === theme.themeId) ?? THEMES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pickTheme = (id: ThemeId) => {
    setTheme({ ...theme, themeId: id });
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all font-mono text-xs relative overflow-hidden"
        style={{
          background: open
            ? `${currentDef.swatches[1]}18`
            : "rgba(255,255,255,0.04)",
          border: open
            ? `1px solid ${currentDef.swatches[1]}50`
            : "1px solid rgba(255,255,255,0.08)",
          color: open
            ? currentDef.swatches[1]
            : "hsl(var(--muted-foreground))",
        }}
        title="Change theme"
      >
        {/* Current theme swatch */}
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{
            background: `linear-gradient(135deg, ${currentDef.swatches[1]}, ${currentDef.swatches[2]})`,
            boxShadow: `0 0 6px ${currentDef.swatches[1]}60`,
          }}
        />
        {!compact && (
          <span className="hidden sm:inline">{currentDef.label}</span>
        )}
        <Palette className="w-3 h-3" />
      </motion.button>

      {/* Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="absolute right-0 top-full mt-2 z-[200] p-3 rounded-2xl w-72"
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)",
              backdropFilter: "blur(20px)",
            }}
          >
            <p className="text-[10px] font-mono uppercase tracking-widest mb-3 px-1"
              style={{ color: "hsl(var(--muted-foreground))" }}>
              Color Theme
            </p>

            {/* Theme cards grid — dark themes */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              {THEMES.filter(t => t.mode === "dark").map(t => (
                <ThemeCard
                  key={t.id}
                  def={t}
                  active={theme.themeId === t.id}
                  onPick={() => pickTheme(t.id)}
                />
              ))}
            </div>

            {/* Divider */}
            <div className="h-px my-2" style={{ background: "hsl(var(--border))" }} />
            <p className="text-[10px] font-mono uppercase tracking-widest mb-2 px-1"
              style={{ color: "hsl(var(--muted-foreground))" }}>
              Light Mode
            </p>

            {/* Light themes */}
            {THEMES.filter(t => t.mode === "light").map(t => (
              <ThemeCard
                key={t.id}
                def={t}
                active={theme.themeId === t.id}
                onPick={() => pickTheme(t.id)}
                wide
              />
            ))}

            {/* Font row */}
            <div className="h-px my-3" style={{ background: "hsl(var(--border))" }} />
            <p className="text-[10px] font-mono uppercase tracking-widest mb-2 px-1"
              style={{ color: "hsl(var(--muted-foreground))" }}>
              Font
            </p>
            <div className="flex gap-1.5">
              {(["inter", "jetbrains", "geist"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTheme({ ...theme, font: f })}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-mono transition-all"
                  style={theme.font === f ? {
                    background: `${currentDef.swatches[1]}20`,
                    border: `1px solid ${currentDef.swatches[1]}50`,
                    color: currentDef.swatches[1],
                  } : {
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--muted-foreground))",
                  }}
                >
                  {f === "inter" ? "Inter" : f === "jetbrains" ? "JB Mono" : "Geist"}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ThemeCard({
  def, active, onPick, wide = false,
}: {
  def: typeof THEMES[0];
  active: boolean;
  onPick: () => void;
  wide?: boolean;
}) {
  return (
    <motion.button
      onClick={onPick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`relative rounded-xl overflow-hidden text-left transition-all ${wide ? "w-full" : ""}`}
      style={{
        border: active
          ? `1.5px solid ${def.swatches[1]}`
          : "1.5px solid rgba(255,255,255,0.08)",
        boxShadow: active
          ? `0 0 16px ${def.swatches[1]}30`
          : "none",
      }}
    >
      {/* Preview gradient */}
      <div
        className="h-10 w-full relative"
        style={{
          background: `linear-gradient(135deg, ${def.swatches[0]} 0%, ${def.swatches[0]} 40%, ${def.swatches[2]}40 100%)`,
        }}
      >
        {/* Simulated dots */}
        <div className="absolute inset-0 flex items-center justify-center gap-1.5 px-3">
          {def.swatches.map((s, i) => (
            <span
              key={i}
              className="rounded-full flex-1"
              style={{
                height: i === 1 ? 8 : 5,
                background: s,
                opacity: i === 1 ? 1 : 0.5,
                boxShadow: i === 1 ? `0 0 8px ${s}` : "none",
              }}
            />
          ))}
        </div>

        {/* Mode badge */}
        <div
          className="absolute top-1 right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-mono"
          style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.7)" }}
        >
          {def.mode === "light"
            ? <Sun className="w-2 h-2" />
            : <Moon className="w-2 h-2" />
          }
          {def.mode}
        </div>

        {/* Active check */}
        {active && (
          <div
            className="absolute top-1 left-1.5 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: def.swatches[1] }}
          >
            <Check className="w-2.5 h-2.5 text-white" />
          </div>
        )}
      </div>

      {/* Label row */}
      <div
        className="px-2.5 py-1.5"
        style={{ background: "hsl(var(--card))" }}
      >
        <p className="text-[11px] font-mono font-bold" style={{ color: "hsl(var(--foreground))" }}>
          {def.label}
        </p>
        <p className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>
          {def.description}
        </p>
      </div>
    </motion.button>
  );
}
