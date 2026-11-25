import type { ThemePreference } from "@/theme/preference";

/** What the Settings screen shows and does, rendered natively per platform. */
export type SettingsMenuProps = {
  themePreference: ThemePreference;
  onThemePreferenceChange: (preference: ThemePreference) => void;
  onOpenAbout: () => void;
  onOpenPrivacy: () => void;
  sourceUrl: string;
  version?: string;
};
