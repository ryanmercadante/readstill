import { createContext, useContext } from "react";
import type { Theme } from "../lib/theme";

export const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
} | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeContext");
  return context;
}
