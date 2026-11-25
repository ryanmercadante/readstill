// Import each weight from its own module. The package entry points bundle
// every weight in the family.
import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_500Medium } from "@expo-google-fonts/manrope/500Medium";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope/600SemiBold";
import { Manrope_700Bold } from "@expo-google-fonts/manrope/700Bold";
import { SourceSerif4_400Regular } from "@expo-google-fonts/source-serif-4/400Regular";
import { SourceSerif4_500Medium } from "@expo-google-fonts/source-serif-4/500Medium";
import type { TextStyle } from "react-native";

// Source Serif 4 for reading and headings, Manrope for controls, as on the web.
// The web loads variable fonts; these are static cuts, so web weight 450 maps
// to Medium (500) and 650 maps to SemiBold (600). Each weight is its own
// family, so set fontFamily and leave fontWeight unset; Android would
// otherwise synthesize a bolder face.
export const fonts = {
  serif: "SourceSerif4-Regular",
  serifMedium: "SourceSerif4-Medium",
  sans: "Manrope-Regular",
  sansMedium: "Manrope-Medium",
  sansSemiBold: "Manrope-SemiBold",
  sansBold: "Manrope-Bold",
} as const;

/** Passed to useFonts in the root layout. */
export const fontAssets = {
  [fonts.serif]: SourceSerif4_400Regular,
  [fonts.serifMedium]: SourceSerif4_500Medium,
  [fonts.sans]: Manrope_400Regular,
  [fonts.sansMedium]: Manrope_500Medium,
  [fonts.sansSemiBold]: Manrope_600SemiBold,
  [fonts.sansBold]: Manrope_700Bold,
};

// The DESIGN.md type roles at their phone sizes. Sizes scale with the system
// text size setting.
export const typography = {
  headline: {
    fontFamily: fonts.serifMedium,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -1.1,
  },
  title: {
    fontFamily: fonts.serifMedium,
    fontSize: 31,
    lineHeight: 37,
    letterSpacing: -0.8,
  },
  body: {
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 37,
  },
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
  },
} satisfies Record<string, TextStyle>;
