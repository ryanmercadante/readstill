import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

// Tabs sit at the root of the stack so Reader and Add can open above them.
export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
