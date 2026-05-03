// ─── Theme System ─────────────────────────────────────────────────────────────
// 5 hand-crafted themes: 4 dark + 1 light.
// Each theme sets ALL CSS custom properties so the whole UI repaints.

export type ThemeId = "midnight" | "ember" | "verdant" | "crimson" | "daylight";

export interface ThemeConfig {
  themeId: ThemeId;
  font: "inter" | "jetbrains" | "geist";
  syntaxTheme: "dracula" | "nord" | "catppuccin" | "github";
}

// ─── Theme Definitions ────────────────────────────────────────────────────────

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  description: string;
  mode: "dark" | "light";
  /** Swatches shown in the picker: [background, primary, accent] */
  swatches: [string, string, string];
  vars: Record<string, string>;
}

export const THEMES: ThemeDefinition[] = [
  // ─── 1. Midnight — deep space navy + electric teal (new default) ─────────
  {
    id: "midnight",
    label: "Midnight",
    description: "Deep space with electric teal",
    mode: "dark",
    swatches: ["#04070f", "#00b4d8", "#0077a8"],
    vars: {
      "--background":                   "224 50% 3%",
      "--foreground":                   "210 20% 94%",
      "--card":                         "222 40% 5%",
      "--card-foreground":              "210 20% 94%",
      "--card-border":                  "220 30% 10%",
      "--popover":                      "222 40% 5%",
      "--popover-foreground":           "210 20% 94%",
      "--popover-border":               "220 30% 10%",
      "--primary":                      "191 100% 42%",
      "--primary-foreground":           "222 47% 8%",
      "--secondary":                    "222 28% 9%",
      "--secondary-foreground":         "210 20% 94%",
      "--muted":                        "220 28% 8%",
      "--muted-foreground":             "220 15% 54%",
      "--accent":                       "191 100% 42%",
      "--accent-foreground":            "222 47% 8%",
      "--destructive":                  "0 84% 60%",
      "--destructive-foreground":       "0 0% 98%",
      "--border":                       "220 28% 11%",
      "--input":                        "220 28% 11%",
      "--ring":                         "191 100% 42%",
      "--sidebar":                      "224 50% 3.5%",
      "--sidebar-foreground":           "210 20% 94%",
      "--sidebar-border":               "220 28% 9%",
      "--sidebar-primary":              "191 100% 42%",
      "--sidebar-primary-foreground":   "222 47% 8%",
      "--sidebar-accent":               "222 28% 9%",
      "--sidebar-accent-foreground":    "210 20% 94%",
      "--sidebar-ring":                 "191 100% 42%",
      "--chart-1":                      "191 100% 42%",
      "--chart-2":                      "263 80% 65%",
      "--chart-3":                      "152 76% 42%",
      "--chart-4":                      "330 80% 62%",
      "--chart-5":                      "43 95% 55%",
      "--violet":                       "191 100% 42%",
      "--cyan":                         "180 100% 50%",
      "--button-outline":               "rgba(0,180,216,0.12)",
      "--primary-rgb":                  "0, 180, 216",
      "--primary-hex":                  "#00b4d8",
      "--primary-light-hex":            "#38bdf8",
    },
  },

  // ─── 2. Ember — warm forge charcoal + amber gold ─────────────────────────
  {
    id: "ember",
    label: "Ember",
    description: "Warm forge with amber glow",
    mode: "dark",
    swatches: ["#0c0906", "#f59e0b", "#92400e"],
    vars: {
      "--background":                   "20 25% 4%",
      "--foreground":                   "40 20% 94%",
      "--card":                         "22 22% 6%",
      "--card-foreground":              "40 20% 94%",
      "--card-border":                  "25 22% 12%",
      "--popover":                      "22 22% 6%",
      "--popover-foreground":           "40 20% 94%",
      "--popover-border":               "25 22% 12%",
      "--primary":                      "38 95% 52%",
      "--primary-foreground":           "20 47% 8%",
      "--secondary":                    "22 20% 10%",
      "--secondary-foreground":         "40 20% 94%",
      "--muted":                        "20 20% 9%",
      "--muted-foreground":             "25 12% 54%",
      "--accent":                       "38 95% 52%",
      "--accent-foreground":            "20 47% 8%",
      "--destructive":                  "0 84% 60%",
      "--destructive-foreground":       "0 0% 98%",
      "--border":                       "25 22% 13%",
      "--input":                        "25 22% 13%",
      "--ring":                         "38 95% 52%",
      "--sidebar":                      "20 25% 4.5%",
      "--sidebar-foreground":           "40 20% 94%",
      "--sidebar-border":               "25 20% 10%",
      "--sidebar-primary":              "38 95% 52%",
      "--sidebar-primary-foreground":   "20 47% 8%",
      "--sidebar-accent":               "22 20% 10%",
      "--sidebar-accent-foreground":    "40 20% 94%",
      "--sidebar-ring":                 "38 95% 52%",
      "--chart-1":                      "38 95% 52%",
      "--chart-2":                      "20 90% 48%",
      "--chart-3":                      "152 76% 42%",
      "--chart-4":                      "330 80% 62%",
      "--chart-5":                      "191 100% 42%",
      "--violet":                       "38 95% 52%",
      "--cyan":                         "38 80% 65%",
      "--button-outline":               "rgba(245,158,11,0.12)",
      "--primary-rgb":                  "245, 158, 11",
      "--primary-hex":                  "#f59e0b",
      "--primary-light-hex":            "#fcd34d",
    },
  },

  // ─── 3. Verdant — obsidian + electric emerald ────────────────────────────
  {
    id: "verdant",
    label: "Verdant",
    description: "Obsidian with electric emerald",
    mode: "dark",
    swatches: ["#050d08", "#10b981", "#065f46"],
    vars: {
      "--background":                   "150 30% 3%",
      "--foreground":                   "150 15% 94%",
      "--card":                         "148 25% 5%",
      "--card-foreground":              "150 15% 94%",
      "--card-border":                  "150 22% 10%",
      "--popover":                      "148 25% 5%",
      "--popover-foreground":           "150 15% 94%",
      "--popover-border":               "150 22% 10%",
      "--primary":                      "160 84% 39%",
      "--primary-foreground":           "150 47% 7%",
      "--secondary":                    "148 22% 9%",
      "--secondary-foreground":         "150 15% 94%",
      "--muted":                        "150 20% 8%",
      "--muted-foreground":             "150 12% 52%",
      "--accent":                       "160 84% 39%",
      "--accent-foreground":            "150 47% 7%",
      "--destructive":                  "0 84% 60%",
      "--destructive-foreground":       "0 0% 98%",
      "--border":                       "150 22% 11%",
      "--input":                        "150 22% 11%",
      "--ring":                         "160 84% 39%",
      "--sidebar":                      "150 30% 3.5%",
      "--sidebar-foreground":           "150 15% 94%",
      "--sidebar-border":               "150 20% 9%",
      "--sidebar-primary":              "160 84% 39%",
      "--sidebar-primary-foreground":   "150 47% 7%",
      "--sidebar-accent":               "148 22% 9%",
      "--sidebar-accent-foreground":    "150 15% 94%",
      "--sidebar-ring":                 "160 84% 39%",
      "--chart-1":                      "160 84% 39%",
      "--chart-2":                      "191 100% 42%",
      "--chart-3":                      "43 95% 55%",
      "--chart-4":                      "330 80% 62%",
      "--chart-5":                      "263 80% 65%",
      "--violet":                       "160 84% 39%",
      "--cyan":                         "160 70% 55%",
      "--button-outline":               "rgba(16,185,129,0.12)",
      "--primary-rgb":                  "16, 185, 129",
      "--primary-hex":                  "#10b981",
      "--primary-light-hex":            "#34d399",
    },
  },

  // ─── 4. Crimson — dark obsidian + electric rose ───────────────────────────
  {
    id: "crimson",
    label: "Crimson",
    description: "Dark with electric rose",
    mode: "dark",
    swatches: ["#0c0507", "#f43f5e", "#9f1239"],
    vars: {
      "--background":                   "340 25% 4%",
      "--foreground":                   "0 15% 94%",
      "--card":                         "340 22% 6%",
      "--card-foreground":              "0 15% 94%",
      "--card-border":                  "340 20% 11%",
      "--popover":                      "340 22% 6%",
      "--popover-foreground":           "0 15% 94%",
      "--popover-border":               "340 20% 11%",
      "--primary":                      "347 90% 60%",
      "--primary-foreground":           "340 47% 8%",
      "--secondary":                    "340 18% 10%",
      "--secondary-foreground":         "0 15% 94%",
      "--muted":                        "340 18% 9%",
      "--muted-foreground":             "340 10% 52%",
      "--accent":                       "347 90% 60%",
      "--accent-foreground":            "340 47% 8%",
      "--destructive":                  "0 84% 60%",
      "--destructive-foreground":       "0 0% 98%",
      "--border":                       "340 20% 12%",
      "--input":                        "340 20% 12%",
      "--ring":                         "347 90% 60%",
      "--sidebar":                      "340 25% 4.5%",
      "--sidebar-foreground":           "0 15% 94%",
      "--sidebar-border":               "340 18% 9%",
      "--sidebar-primary":              "347 90% 60%",
      "--sidebar-primary-foreground":   "340 47% 8%",
      "--sidebar-accent":               "340 18% 10%",
      "--sidebar-accent-foreground":    "0 15% 94%",
      "--sidebar-ring":                 "347 90% 60%",
      "--chart-1":                      "347 90% 60%",
      "--chart-2":                      "20 90% 54%",
      "--chart-3":                      "160 84% 39%",
      "--chart-4":                      "43 95% 55%",
      "--chart-5":                      "263 80% 65%",
      "--violet":                       "347 90% 60%",
      "--cyan":                         "347 70% 72%",
      "--button-outline":               "rgba(244,63,94,0.12)",
      "--primary-rgb":                  "244, 63, 94",
      "--primary-hex":                  "#f43f5e",
      "--primary-light-hex":            "#fb7185",
    },
  },

  // ─── 5. Daylight — warm cream + indigo (light mode) ──────────────────────
  {
    id: "daylight",
    label: "Daylight",
    description: "Clean light with warm cream",
    mode: "light",
    swatches: ["#f5f7fc", "#4f6ef7", "#1e3a8a"],
    vars: {
      "--background":                   "220 30% 97%",
      "--foreground":                   "222 47% 11%",
      "--card":                         "0 0% 100%",
      "--card-foreground":              "222 47% 11%",
      "--card-border":                  "214 32% 88%",
      "--popover":                      "0 0% 100%",
      "--popover-foreground":           "222 47% 11%",
      "--popover-border":               "214 32% 88%",
      "--primary":                      "225 80% 60%",
      "--primary-foreground":           "0 0% 100%",
      "--secondary":                    "210 35% 93%",
      "--secondary-foreground":         "222 47% 20%",
      "--muted":                        "210 35% 93%",
      "--muted-foreground":             "215 18% 47%",
      "--accent":                       "225 80% 60%",
      "--accent-foreground":            "0 0% 100%",
      "--destructive":                  "0 84% 52%",
      "--destructive-foreground":       "0 0% 98%",
      "--border":                       "214 32% 88%",
      "--input":                        "214 32% 88%",
      "--ring":                         "225 80% 60%",
      "--sidebar":                      "220 22% 93%",
      "--sidebar-foreground":           "222 47% 11%",
      "--sidebar-border":               "214 28% 85%",
      "--sidebar-primary":              "225 80% 60%",
      "--sidebar-primary-foreground":   "0 0% 100%",
      "--sidebar-accent":               "210 35% 88%",
      "--sidebar-accent-foreground":    "222 47% 20%",
      "--sidebar-ring":                 "225 80% 60%",
      "--chart-1":                      "225 80% 60%",
      "--chart-2":                      "191 100% 38%",
      "--chart-3":                      "160 80% 35%",
      "--chart-4":                      "330 75% 55%",
      "--chart-5":                      "38 90% 50%",
      "--violet":                       "225 80% 60%",
      "--cyan":                         "191 80% 45%",
      "--button-outline":               "rgba(79,110,247,0.15)",
      "--primary-rgb":                  "79, 110, 247",
      "--primary-hex":                  "#4f6ef7",
      "--primary-light-hex":            "#818cf8",
      // Override elevate for light mode
      "--elevate-1":                    "rgba(0,0,0,0.04)",
      "--elevate-2":                    "rgba(0,0,0,0.08)",
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const DEFAULT_THEME: ThemeConfig = {
  themeId: "midnight",
  font: "inter",
  syntaxTheme: "dracula",
};

const STORAGE_KEY = "specforge-theme-v2";

export function loadTheme(): ThemeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_THEME;
    return { ...DEFAULT_THEME, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(config: ThemeConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function applyTheme(config: ThemeConfig) {
  const root = document.documentElement;
  const def = THEMES.find(t => t.id === config.themeId) ?? THEMES[0];

  // Apply all CSS custom properties from theme
  Object.entries(def.vars).forEach(([k, v]) => root.style.setProperty(k, v));

  // Handle dark / light class
  if (def.mode === "light") {
    root.classList.remove("dark");
    root.classList.add("theme-light");
  } else {
    root.classList.add("dark");
    root.classList.remove("theme-light");
  }

  // Font
  const fontMap: Record<ThemeConfig["font"], string> = {
    inter:      "'Inter', sans-serif",
    jetbrains:  "'JetBrains Mono', monospace",
    geist:      "'Geist Mono', monospace",
  };
  root.style.setProperty("--app-font-sans", fontMap[config.font]);

  // Syntax theme
  const syntaxBg: Record<ThemeConfig["syntaxTheme"], string> = {
    dracula:    "#282A36",
    nord:       "#2E3440",
    catppuccin: "#1E1E2E",
    github:     "#0D1117",
  };
  root.style.setProperty("--syntax-bg", syntaxBg[config.syntaxTheme]);
}

// ─── Legacy compat (kept so old imports don't break) ─────────────────────────

export const FONT_OPTIONS: { value: ThemeConfig["font"]; label: string; css: string }[] = [
  { value: "inter",      label: "Inter",          css: "'Inter', sans-serif" },
  { value: "jetbrains",  label: "JetBrains Mono", css: "'JetBrains Mono', monospace" },
  { value: "geist",      label: "Geist Mono",     css: "'Geist Mono', monospace" },
];

export const SYNTAX_THEMES: { value: ThemeConfig["syntaxTheme"]; label: string; preview: string }[] = [
  { value: "dracula",    label: "Dracula",     preview: "#282A36" },
  { value: "nord",       label: "Nord",        preview: "#2E3440" },
  { value: "catppuccin", label: "Catppuccin",  preview: "#1E1E2E" },
  { value: "github",     label: "GitHub Dark", preview: "#0D1117" },
];

// Legacy: kept for preferences-modal compat
export const ACCENT_PRESETS = THEMES.map(t => ({
  label: t.label,
  hue: 0,
  hex: t.swatches[1],
  themeId: t.id,
}));
