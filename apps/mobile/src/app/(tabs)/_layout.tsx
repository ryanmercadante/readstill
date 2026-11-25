import { NativeTabs } from "expo-router/native-tabs";

// The two top-level destinations. Reader and Add open above the tabs.
export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
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
