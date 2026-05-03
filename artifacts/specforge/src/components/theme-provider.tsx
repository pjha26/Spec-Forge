import { useEffect, createContext, useContext, useState } from "react";
import { loadTheme, saveTheme, applyTheme, type ThemeConfig, DEFAULT_THEME } from "@/lib/theme";

interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (t: ThemeConfig) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeConfig>(DEFAULT_THEME);

  useEffect(() => {
    const stored = loadTheme();
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  const setTheme = (t: ThemeConfig) => {
    setThemeState(t);
    saveTheme(t);
    applyTheme(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
