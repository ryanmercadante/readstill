import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";
import { Appearance } from "react-native";

export type ThemePreference = "system" | "light" | "dark";

export const themePreferences: ThemePreference[] = ["system", "light", "dark"];

export const themePreferenceLabels: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

const storageKey = "theme";
const listeners = new Set<() => void>();
let current: ThemePreference = "system";

function apply(preference: ThemePreference) {
  // Overrides the appearance for the whole app, native tabs and headers
  // included, so useColorScheme and useAppTheme follow it.
  Appearance.setColorScheme(preference === "system" ? "unspecified" : preference);
}

/**
 * Reads the saved preference and applies it. Call once at startup, before the
 * first render, so the app opens in the chosen theme.
 */
export function applyStoredThemePreference() {
  try {
    const stored = Storage.getItemSync(storageKey);
    if (stored === "light" || stored === "dark") current = stored;
  } catch {
    // Unreadable storage leaves the system appearance in place.
  }
  apply(current);
}

/**
 * Applies a preference and saves it. If saving fails, the choice still lasts
 * for this session, as on the web when cookies are blocked.
 */
export function setThemePreference(preference: ThemePreference) {
  current = preference;
  apply(preference);
  try {
    Storage.setItemSync(storageKey, preference);
  } catch {
    // Keep the in-memory choice.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, () => current);
}
