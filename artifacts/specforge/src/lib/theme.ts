export interface ThemeConfig {
  accentHue: number;
  font: "inter" | "jetbrains" | "geist";
  syntaxTheme: "dracula" | "nord" | "catppuccin" | "github";
}

const STORAGE_KEY = "specforge-theme";

export const ACCENT_PRESETS = [
  { label: "Violet",   hue: 263,  hex: "#8B5CF6" },
  { label: "Cyan",     hue: 193,  hex: "#06B6D4" },
  { label: "Rose",     hue: 330,  hex: "#F43F5E" },
  { label: "Amber",    hue: 43,   hex: "#F59E0B" },
  { label: "Emerald",  hue: 162,  hex: "#10B981" },
  { label: "Blue",     hue: 220,  hex: "#3B82F6" },
];

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

export const DEFAULT_THEME: ThemeConfig = {
  accentHue: 263,
  font: "inter",
  syntaxTheme: "dracula",
};

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

  // Accent color — update all primary/accent/ring/sidebar-primary CSS vars
  const h = config.accentHue;
  root.style.setProperty("--primary", `${h} 90% 64%`);
  root.style.setProperty("--accent", `${h} 90% 64%`);
  root.style.setProperty("--ring", `${h} 90% 64%`);
  root.style.setProperty("--sidebar-primary", `${h} 90% 64%`);
  root.style.setProperty("--sidebar-ring", `${h} 90% 64%`);
  root.style.setProperty("--chart-1", `${h} 90% 64%`);
  root.style.setProperty("--violet", `${h} 90% 64%`);

  // Font
  const fontOption = FONT_OPTIONS.find(f => f.value === config.font) ?? FONT_OPTIONS[0];
  root.style.setProperty("--app-font-sans", fontOption.css);

  // Syntax theme — code block background colors
  const syntaxBg: Record<ThemeConfig["syntaxTheme"], string> = {
    dracula: "#282A36",
    nord: "#2E3440",
    catppuccin: "#1E1E2E",
    github: "#0D1117",
  };
  root.style.setProperty("--syntax-bg", syntaxBg[config.syntaxTheme]);
}
