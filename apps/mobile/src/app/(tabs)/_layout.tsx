import { NativeTabs } from "expo-router/native-tabs";

import { fonts, useAppTheme } from "@/theme";

// The two top-level destinations. Reader and Add open above the tabs.
// Selected and inactive tabs mirror the web view switch: ink for the selected
// item, toggle ink for the rest, and the switch track as Android's indicator.
export default function TabsLayout() {
  const { colors } = useAppTheme();

  return (
    <NativeTabs
      backgroundColor={colors.paper}
      iconColor={{ default: colors.toggleInk, selected: colors.ink }}
      labelStyle={{
        default: { color: colors.toggleInk, fontFamily: fonts.sansSemiBold },
        selected: { color: colors.ink, fontFamily: fonts.sansSemiBold },
      }}
      indicatorColor={colors.switchTrack}
      rippleColor={colors.ghostPressed}
    >
      <NativeTabs.Trigger name="(library)">
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "books.vertical", selected: "books.vertical.fill" }}
          md="library_books"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
          md="settings"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
