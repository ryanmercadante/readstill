// Still's palette, converted from the OKLCH tokens in apps/web/src/styles.css
// to sRGB hex, since React Native does not parse oklch(). Names follow the web
// tokens; web hover states become pressed states. Keep both files in step.

export type ColorScheme = "light" | "dark";

export type Colors = {
  /** Page, dock, sheets, and tab bar. */
  paper: string;
  /** Prose and primary button fill. */
  ink: string;
  /** Supporting labels. */
  muted: string;
  /** Dividers and progress track. */
  line: string;
  /** Terracotta: anchor letter, progress fill, slider, focus. */
  accent: string;
  /** Current-word wash. */
  tint: string;
  /** Current-word text. */
  highlightInk: string;
  /** Fields and the selected view. */
  controlSurface: string;
  /** View switch track. */
  switchTrack: string;
  accentSurface: string;
  /** Primary button while pressed (web: primary hover). */
  primaryPressed: string;
  /** Ghost and icon buttons while pressed (web: ghost hover). */
  ghostPressed: string;
  /** Inactive item in the view switch. */
  toggleInk: string;
  inputBorder: string;
  outlineBorder: string;
  placeholder: string;
  error: string;
  selection: string;
  linkUnderline: string;
  sliderTrack: string;
  sliderBorder: string;
  /** Focus guide marks. */
  guide: string;
  divider: string;
  /** Modal backdrop, with alpha. */
  backdrop: string;
};

export const colors: Record<ColorScheme, Colors> = {
  light: {
    paper: "#f7f5ef",
    ink: "#302f2a",
    muted: "#706d64",
    line: "#dedbd2",
    accent: "#a7462f",
    tint: "#f0ded3",
    highlightInk: "#7b3525",
    controlSurface: "#fffefa",
    switchTrack: "#edeae2",
    accentSurface: "#f0ede5",
    primaryPressed: "#514d40",
    ghostPressed: "#eae6dd",
    toggleInk: "#68655d",
    inputBorder: "#cec8bc",
    outlineBorder: "#cec9be",
    placeholder: "#767165",
    error: "#9a2b21",
    selection: "#ebcfbd",
    linkUnderline: "#b4ab9d",
    sliderTrack: "#efefef",
    sliderBorder: "#b6b6b6",
    guide: "#baa08d",
    divider: "#c8c2b6",
    backdrop: "#302a2259",
  },
  dark: {
    paper: "#211f1b",
    ink: "#e7e2d8",
    muted: "#b3ac9f",
    line: "#454037",
    accent: "#df9478",
    tint: "#51372c",
    highlightInk: "#f4c0a7",
    controlSurface: "#35312a",
    switchTrack: "#292620",
    accentSurface: "#363128",
    primaryPressed: "#d0c7b5",
    ghostPressed: "#373229",
    toggleInk: "#bdb5a7",
    inputBorder: "#817767",
    outlineBorder: "#817767",
    placeholder: "#b3ac9f",
    error: "#f0a08f",
    selection: "#654633",
    linkUnderline: "#958673",
    sliderTrack: "#454037",
    sliderBorder: "#817767",
    guide: "#b99980",
    divider: "#716657",
    backdrop: "#100e0bcc",
  },
};

/** React Native boxShadow strings for the two web elevations. */
export const shadows: Record<ColorScheme, { toggle: string; dialog: string }> = {
  light: {
    toggle: "0 2px 5px #332d2010",
    dialog: "0 18px 65px #28221830",
  },
  dark: {
    toggle: "0 2px 5px #100e0b40",
    dialog: "0 18px 65px #100e0b80",
  },
};
