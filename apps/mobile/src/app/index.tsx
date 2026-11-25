import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Placeholder for the native Library screen.
export default function LibraryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Library</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "600" },
});
