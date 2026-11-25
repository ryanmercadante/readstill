import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { ScrollView, StyleSheet, Text } from "react-native";

import { SettingsRow, SettingsSection } from "@/components/settings-list";
import { fonts, useAppTheme } from "@/theme";
import {
  setThemePreference,
  themePreferenceLabels,
  themePreferences,
  useThemePreference,
} from "@/theme/preference";

const repoUrl = "https://github.com/ryanmercadante/readstill";

// Export and Restore stay disabled until backups land.
export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const version = Constants.expoConfig?.version;
  const themePreference = useThemePreference();

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <SettingsSection title="Theme">
        {themePreferences.map((option) => (
          <SettingsRow
            key={option}
            label={themePreferenceLabels[option]}
            selected={option === themePreference}
            onPress={() => setThemePreference(option)}
          />
        ))}
      </SettingsSection>

      <SettingsSection title="Library">
        <SettingsRow label="Export backup" disabled />
        <SettingsRow label="Restore backup" disabled />
      </SettingsSection>

      <SettingsSection title="About">
        <SettingsRow label="About Still" href="/settings/about" />
        <SettingsRow label="Privacy" href="/settings/privacy" />
        <SettingsRow label="Source code" external onPress={() => void Linking.openURL(repoUrl)} />
      </SettingsSection>

      {version ? (
        <Text style={[styles.version, { color: colors.muted }]}>Version {version}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  version: { fontFamily: fonts.sans, fontSize: 12, paddingHorizontal: 20, marginTop: 20 },
});
