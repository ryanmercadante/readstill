import { useFonts } from "expo-font";
import { Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";

import { fontAssets, navigationThemes, useAppTheme } from "@/theme";
import { applyStoredThemePreference } from "@/theme/preference";

// Keep the splash screen up until Still's fonts are ready.
void SplashScreen.preventAutoHideAsync();
// Apply the saved Light, Dark, or System choice before the first render.
applyStoredThemePreference();

// Tabs sit at the root of the stack so Reader and Add can open above them.
export default function RootLayout() {
  const { scheme, colors } = useAppTheme();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  // If a font fails to load, continue with the system fonts.
  const ready = fontsLoaded || fontError !== null;

  // The root view shows behind screens during transitions and keyboard moves.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.paper);
  }, [colors.paper]);

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider value={navigationThemes[scheme]}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
