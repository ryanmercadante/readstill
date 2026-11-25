import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { typography, useAppTheme } from "@/theme";

// Placeholder for Settings: theme, backup, About, Privacy, and later Sync.
export default function SettingsScreen() {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]}>
      <Text style={[typography.headline, { color: colors.ink }]}>Settings</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
