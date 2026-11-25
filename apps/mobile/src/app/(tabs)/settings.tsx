import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Placeholder for Settings: theme, text size, pace, backup, About, and later Sync.
export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Settings</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "600" },
});
