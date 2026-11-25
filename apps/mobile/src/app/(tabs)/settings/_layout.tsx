import { Stack } from "expo-router";

import { useStackOptions } from "@/navigation/use-stack-options";

export default function SettingsLayout() {
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ title: "Settings", headerLargeTitleEnabled: true }} />
      <Stack.Screen name="about" options={{ title: "About Still" }} />
      <Stack.Screen name="privacy" options={{ title: "Privacy" }} />
    </Stack>
  );
}
