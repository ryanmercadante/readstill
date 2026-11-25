import { type Href, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { disabledOpacity, fonts, typography, useAppTheme } from "@/theme";

// A flat settings list in Still's style: rows on paper separated by thin
// rules, with no cards.

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.section}>
      <Text
        accessibilityRole="header"
        style={[typography.label, styles.sectionTitle, { color: colors.muted }]}
      >
        {title}
      </Text>
      <View style={[styles.rows, { borderColor: colors.line }]}>{children}</View>
    </View>
  );
}

type SettingsRowProps = {
  label: string;
  /** Current value, shown muted on the trailing side. */
  value?: string;
  /** Marks the chosen option in a list of choices with a checkmark. */
  selected?: boolean;
  disabled?: boolean;
} & (
  | { href: Href; onPress?: never; external?: never }
  | { href?: never; onPress: () => void; external?: boolean }
  | { href?: never; onPress?: never; external?: never }
);

export function SettingsRow({
  label,
  value,
  selected,
  disabled = false,
  href,
  onPress,
  external = false,
}: SettingsRowProps) {
  const { colors } = useAppTheme();
  const router = useRouter();
  const icon = selected
    ? ({ ios: "checkmark", android: "check" } as const)
    : external
      ? ({ ios: "arrow.up.right", android: "open_in_new" } as const)
      : href
        ? ({ ios: "chevron.right", android: "chevron_right" } as const)
        : null;

  // Navigate from onPress rather than wrapping in Link: Link's asChild props
  // replace the Pressable's style function and break the row layout.
  return (
    <Pressable
      onPress={href ? () => router.push(href) : onPress}
      disabled={disabled}
      accessibilityRole={external ? "link" : "button"}
      accessibilityState={{ disabled, selected }}
      style={({ pressed }) => [
        styles.row,
        { borderColor: colors.line },
        pressed && { backgroundColor: colors.ghostPressed },
        disabled && { opacity: disabledOpacity },
      ]}
    >
      <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
      {value ? <Text style={[styles.value, { color: colors.muted }]}>{value}</Text> : null}
      {icon ? (
        <SymbolView name={icon} size={16} tintColor={selected ? colors.accent : colors.muted} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 28 },
  sectionTitle: { paddingHorizontal: 20, marginBottom: 8 },
  rows: { borderTopWidth: StyleSheet.hairlineWidth },
  row: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 16 },
  value: { fontFamily: fonts.sans, fontSize: 16 },
});
