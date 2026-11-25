import { DarkTheme, DefaultTheme, type Theme } from "expo-router";
import { useColorScheme } from "react-native";

import { type ColorScheme, colors, shadows } from "./colors";
import { fonts } from "./typography";

export type { ColorScheme, Colors } from "./colors";
export { colors, shadows } from "./colors";
export { fontAssets, fonts, typography } from "./typography";

/** Corner radii from DESIGN.md. */
export const radii = {
  word: 3,
  switchButton: 5,
  field: 6,
  button: 7,
  switch: 8,
  dialog: 12,
} as const;

export const disabledOpacity = 0.38;

/**
 * The active theme. Follows the system appearance until Settings stores a
 * Light, Dark, or System preference.
 */
export function useAppTheme() {
  const scheme: ColorScheme = useColorScheme() === "dark" ? "dark" : "light";
  return { scheme, colors: colors[scheme], shadows: shadows[scheme] };
}

const navigationFonts: Theme["fonts"] = {
  regular: { fontFamily: fonts.sans, fontWeight: "normal" },
  medium: { fontFamily: fonts.sansMedium, fontWeight: "normal" },
  bold: { fontFamily: fonts.sansSemiBold, fontWeight: "normal" },
  heavy: { fontFamily: fonts.sansBold, fontWeight: "normal" },
};

/** Themes for navigation headers, screen backgrounds, and back buttons. */
export const navigationThemes: Record<ColorScheme, Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      primary: colors.light.accent,
      background: colors.light.paper,
      card: colors.light.paper,
      text: colors.light.ink,
      border: colors.light.line,
      notification: colors.light.accent,
    },
    fonts: navigationFonts,
  },
  dark: {
    ...DarkTheme,
    colors: {
      primary: colors.dark.accent,
      background: colors.dark.paper,
      card: colors.dark.paper,
      text: colors.dark.ink,
      border: colors.dark.line,
      notification: colors.dark.accent,
    },
    fonts: navigationFonts,
  },
};
