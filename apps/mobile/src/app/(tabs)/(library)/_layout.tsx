import { Stack } from "expo-router";

import { useStackOptions } from "@/navigation/use-stack-options";

export default function LibraryLayout() {
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ title: "Library", headerLargeTitleEnabled: true }} />
    </Stack>
  );
}
