import { ScrollView, StyleSheet, Text } from "react-native";

import { typography, useAppTheme } from "@/theme";

// Placeholder. Port the privacy section of the web About page
// (apps/web/src/routes/about.tsx), adjusted for on-device storage.
export default function PrivacyScreen() {
  const { colors } = useAppTheme();

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <Text style={[typography.body, { color: colors.ink }]}>
        Your readings stay on this device.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingVertical: 24 },
});
