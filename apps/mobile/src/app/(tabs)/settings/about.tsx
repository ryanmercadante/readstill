import { ScrollView, StyleSheet, Text } from "react-native";

import { typography, useAppTheme } from "@/theme";

// Placeholder. Port the reading modes and research stance from the web About
// page (apps/web/src/routes/about.tsx), adjusted for the app.
export default function AboutScreen() {
  const { colors } = useAppTheme();

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <Text style={[typography.body, { color: colors.ink }]}>
        Still lets you switch between a normal article and paced, one-word-at-a-time reading without
        losing your place.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingVertical: 24 },
});
