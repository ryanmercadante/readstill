import Constants from "expo-constants";
import { useRouter } from "expo-router";

import { SettingsMenu } from "@/components/settings-menu";
import { setThemePreference, useThemePreference } from "@/theme/preference";

const repoUrl = "https://github.com/ryanmercadante/readstill";

// Export and Restore stay disabled until backups land.
export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SettingsMenu
      themePreference={useThemePreference()}
      onThemePreferenceChange={setThemePreference}
      onOpenAbout={() => router.push("/settings/about")}
      onOpenPrivacy={() => router.push("/settings/privacy")}
      sourceUrl={repoUrl}
      version={Constants.expoConfig?.version}
    />
  );
}
