import {
  Button,
  Form,
  HStack,
  Host,
  Image,
  Link,
  Picker,
  Section,
  Spacer,
  Text,
} from "@expo/ui/swift-ui";
import {
  disabled,
  font,
  foregroundStyle,
  listRowBackground,
  pickerStyle,
  scrollContentBackground,
  tag,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import type { ComponentProps } from "react";

import { fonts, useAppTheme } from "@/theme";
import { themePreferenceLabels, themePreferences } from "@/theme/preference";

import type { SettingsMenuProps } from "./types";

// SwiftUI Form in Still's colors: pale cream rows on paper, Manrope text that
// scales with Dynamic Type, and terracotta for controls.
export function SettingsMenu({
  themePreference,
  onThemePreferenceChange,
  onOpenAbout,
  onOpenPrivacy,
  sourceUrl,
  version,
}: SettingsMenuProps) {
  const { scheme, colors } = useAppTheme();
  const sectionModifiers = [listRowBackground(colors.controlSurface)];

  return (
    <Host style={{ flex: 1 }} colorScheme={scheme}>
      <Form
        modifiers={[
          scrollContentBackground("hidden"),
          tint(colors.accent),
          font({ family: fonts.sansMedium, size: 17, textStyle: "body" }),
        ]}
      >
        <Section title="Appearance" modifiers={sectionModifiers}>
          <Picker
            label="Theme"
            selection={themePreference}
            onSelectionChange={onThemePreferenceChange}
            modifiers={[pickerStyle("menu")]}
          >
            {themePreferences.map((option) => (
              <Text key={option} modifiers={[tag(option)]}>
                {themePreferenceLabels[option]}
              </Text>
            ))}
          </Picker>
        </Section>

        <Section title="Library" modifiers={sectionModifiers}>
          <Button label="Export backup" modifiers={[disabled()]} />
          <Button label="Restore backup" modifiers={[disabled()]} />
        </Section>

        <Section
          title="About"
          footer={version ? <Text>{`Version ${version}`}</Text> : undefined}
          modifiers={sectionModifiers}
        >
          <Button onPress={onOpenAbout}>
            <Row label="About Still" icon="chevron.right" />
          </Button>
          <Button onPress={onOpenPrivacy}>
            <Row label="Privacy" icon="chevron.right" />
          </Button>
          <Link destination={sourceUrl}>
            <Row label="Source code" icon="arrow.up.right" />
          </Link>
        </Section>
      </Form>
    </Host>
  );
}

/** Row content in ink with a muted trailing symbol, so buttons don't take the tint. */
function Row({ label, icon }: { label: string; icon: ComponentProps<typeof Image>["systemName"] }) {
  const { colors } = useAppTheme();

  return (
    <HStack>
      <Text modifiers={[foregroundStyle(colors.ink)]}>{label}</Text>
      <Spacer />
      <Image systemName={icon} size={13} color={colors.muted} />
    </HStack>
  );
}
