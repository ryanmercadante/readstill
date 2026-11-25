import type { NativeStackNavigationOptions } from "expo-router";

import { fonts, useAppTheme } from "@/theme";

/**
 * Header styling shared by the stack inside each tab: a serif large title on
 * iOS and terracotta back buttons. Header and screen backgrounds come from the
 * navigation theme, so iOS keeps its standard header behavior.
 */
export function useStackOptions(): NativeStackNavigationOptions {
  const { colors } = useAppTheme();

  return {
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerTintColor: colors.accent,
    headerTitleStyle: { fontFamily: fonts.sansSemiBold, color: colors.ink },
    headerLargeTitleStyle: { fontFamily: fonts.serifMedium, color: colors.ink },
    headerBackButtonDisplayMode: "minimal",
  };
}
