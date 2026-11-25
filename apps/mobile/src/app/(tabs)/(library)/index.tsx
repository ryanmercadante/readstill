import { ScrollView, StyleSheet, Text } from "react-native";

import { fonts, useAppTheme } from "@/theme";

// Placeholder for the native Library screen.
export default function LibraryScreen() {
  const { colors } = useAppTheme();

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <Text style={[styles.empty, { color: colors.muted }]}>Your readings will appear here.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingVertical: 24 },
  empty: { fontFamily: fonts.sans, fontSize: 16 },
});
