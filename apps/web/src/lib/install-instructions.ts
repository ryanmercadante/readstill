export type InstallIllustration = "share" | "dock" | "homeScreen" | "confirm" | "confirmWebApp";
type Step = { text: string; illustration: InstallIllustration };

export type InstallInstructions =
  | { kind: "walkthrough"; label: string; steps: Step[] }
  | { kind: "firefox"; label: string; text: string; offerBackup: boolean }
  | { kind: "chromium"; android: boolean };

const confirmWebApp: Step = {
  illustration: "confirmWebApp",
  text: "Leave Open as Web App on if it appears, then tap Add. You can now open Still from your Home Screen.",
};
const walkthroughs = {
  iPhone: [
    {
      illustration: "share",
      text: "Open Still in Safari and tap Share. If Share is hidden, open the toolbar menu first.",
    },
    {
      illustration: "homeScreen",
      text: "Scroll to Add to Home Screen. If it’s missing, use Edit Actions to add it.",
    },
    confirmWebApp,
  ],
  iPad: [
    { illustration: "share", text: "Open Still in Safari and tap Share in the toolbar." },
    {
      illustration: "homeScreen",
      text: "Choose Add to Home Screen. If it’s hidden, tap More to see the other actions.",
    },
    confirmWebApp,
  ],
  "Mac Safari": [
    {
      illustration: "dock",
      text: "In Safari on macOS Sonoma 14 or later, click Share in the top-right corner of the toolbar, then choose Add to Dock.",
    },
    {
      illustration: "confirm",
      text: "Keep the name Still or choose your own, then click Add in the lower-right corner. Open Still from your Dock to go to your library.",
    },
  ],
  "Firefox on iOS": [
    { illustration: "share", text: "In Firefox, tap Share in the address bar." },
    { illustration: "homeScreen", text: "Choose Add to Home Screen in the share menu." },
    {
      illustration: "confirm",
      text: "Confirm the name Still, then tap Add in the top-right corner.",
    },
  ],
} satisfies Record<string, Step[]>;

const firefoxGuides = {
  "Firefox on Android":
    "Open the three-dot menu and tap Install. In the Home Screen prompt, tap Add automatically or drag the Still icon into place.",
  "Firefox on Windows":
    "In a regular Firefox window, look for the web apps button in the address bar. Click it to open Still in its own window. If Windows offers to pin Still to the taskbar, choose Yes.",
  "Firefox on Mac":
    "To add Still to your Dock, open this library URL in Safari on macOS Sonoma 14 or later, then choose Share → Add to Dock.",
  "Firefox on Linux":
    "If your Firefox address bar has a web apps button, click it to open Still in its own window. Otherwise, bookmark your library for quick access.",
} as const;
function walkthrough(label: keyof typeof walkthroughs): InstallInstructions {
  return { kind: "walkthrough", label, steps: walkthroughs[label] };
}
function firefox(label: keyof typeof firefoxGuides): InstallInstructions {
  return {
    kind: "firefox",
    label,
    text: firefoxGuides[label],
    offerBackup: label === "Firefox on Mac",
  };
}

export function detectInstallInstructions({
  userAgent,
  maxTouchPoints,
}: Navigator): InstallInstructions | null {
  if (/FxiOS\//.test(userAgent)) return walkthrough("Firefox on iOS");
  if (/iPhone/.test(userAgent)) return walkthrough("iPhone");
  // iPadOS can request desktop sites and identify itself as a Mac.
  if (/iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1))
    return walkthrough("iPad");
  if (/Firefox\//.test(userAgent)) {
    if (/Android/.test(userAgent)) return firefox("Firefox on Android");
    if (/Windows/.test(userAgent)) return firefox("Firefox on Windows");
    if (/Macintosh/.test(userAgent)) return firefox("Firefox on Mac");
    if (/Linux/.test(userAgent)) return firefox("Firefox on Linux");
  }
  if (/Chrom(?:e|ium)\//.test(userAgent))
    return { kind: "chromium", android: /Android/.test(userAgent) };
  if (/Macintosh/.test(userAgent) && /Version\/.*Safari\//.test(userAgent))
    return walkthrough("Mac Safari");
  return null;
}
