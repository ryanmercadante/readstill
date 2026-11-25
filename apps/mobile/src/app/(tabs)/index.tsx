import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { typography, useAppTheme } from "@/theme";

// Placeholder for the native Library screen.
export default function LibraryScreen() {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]}>
      <Text style={[typography.headline, { color: colors.ink }]}>Library</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
