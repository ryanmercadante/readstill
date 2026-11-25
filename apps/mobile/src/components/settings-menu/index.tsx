import { FieldGroup, ListItem } from "@expo/ui";
import {
  DropdownMenu,
  DropdownMenuItem,
  Host,
  type MaterialColors,
  RadioButton,
  Text,
} from "@expo/ui/jetpack-compose";
import { alpha } from "@expo/ui/jetpack-compose/modifiers";
import * as Linking from "expo-linking";
import { useState } from "react";

import { disabledOpacity, fonts, useAppTheme } from "@/theme";
import { themePreferenceLabels, themePreferences } from "@/theme/preference";

import type { SettingsMenuProps } from "./types";

type Hex = `#${string}`;

// Android: Expo UI's Material grouped list, with Material's color roles mapped
// to Still's palette so menus, rows, and text match the rest of the app.
export function SettingsMenu({
  themePreference,
  onThemePreferenceChange,
  onOpenAbout,
  onOpenPrivacy,
  sourceUrl,
  version,
}: SettingsMenuProps) {
  const { scheme, colors } = useAppTheme();
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const colorOverrides: Partial<MaterialColors> = {
    primary: colors.accent as Hex,
    background: colors.paper as Hex,
    surface: colors.paper as Hex,
    onBackground: colors.ink as Hex,
    onSurface: colors.ink as Hex,
    onSurfaceVariant: colors.muted as Hex,
    surfaceContainer: colors.controlSurface as Hex,
    outlineVariant: colors.line as Hex,
  };
  const label = (text: string) => (
    <Text style={{ fontFamily: fonts.sansMedium, fontSize: 16 }}>{text}</Text>
  );

  return (
    <Host style={{ flex: 1 }} colorScheme={scheme} colorOverrides={colorOverrides}>
      <FieldGroup>
        <FieldGroup.Section title="Appearance">
          <ListItem onPress={() => setThemeMenuOpen(true)}>
            {label("Theme")}
            <ListItem.Trailing>
              <DropdownMenu
                expanded={themeMenuOpen}
                onDismissRequest={() => setThemeMenuOpen(false)}
              >
                <DropdownMenu.Trigger>
                  <Text color={colors.muted}>{themePreferenceLabels[themePreference]}</Text>
                </DropdownMenu.Trigger>
                <DropdownMenu.Items>
                  {themePreferences.map((option) => (
                    <DropdownMenuItem
                      key={option}
                      onClick={() => {
                        onThemePreferenceChange(option);
                        setThemeMenuOpen(false);
                      }}
                    >
                      <DropdownMenuItem.LeadingIcon>
                        <RadioButton selected={option === themePreference} />
                      </DropdownMenuItem.LeadingIcon>
                      <DropdownMenuItem.Text>
                        <Text>{themePreferenceLabels[option]}</Text>
                      </DropdownMenuItem.Text>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenu.Items>
              </DropdownMenu>
            </ListItem.Trailing>
          </ListItem>
        </FieldGroup.Section>

        <FieldGroup.Section title="Library">
          <ListItem modifiers={[alpha(disabledOpacity)]}>{label("Export backup")}</ListItem>
          <ListItem modifiers={[alpha(disabledOpacity)]}>{label("Restore backup")}</ListItem>
        </FieldGroup.Section>

        <FieldGroup.Section title="About">
          <ListItem onPress={onOpenAbout}>{label("About Still")}</ListItem>
          <ListItem onPress={onOpenPrivacy}>{label("Privacy")}</ListItem>
          <ListItem onPress={() => void Linking.openURL(sourceUrl)}>
            {label("Source code")}
          </ListItem>
          {version ? (
            <FieldGroup.SectionFooter>
              <Text color={colors.muted}>{`Version ${version}`}</Text>
            </FieldGroup.SectionFooter>
          ) : null}
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}
