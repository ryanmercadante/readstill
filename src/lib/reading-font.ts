import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { readBrowserCookie, saveCookie } from "./cookies";

const serif = "Georgia, serif";
const sans = "system-ui, sans-serif";

/** Typefaces for reading text. Their @font-face rules load from reading-fonts.css. */
export const readingFonts = [
  { id: "source-serif", name: "Source Serif", family: `"Source Serif 4 Variable", ${serif}` },
  { id: "literata", name: "Literata", family: `"Literata Variable", ${serif}` },
  { id: "newsreader", name: "Newsreader", family: `"Newsreader Variable", ${serif}` },
  { id: "charis", name: "Charis", family: `"Charis SIL", ${serif}` },
  { id: "merriweather", name: "Merriweather", family: `"Merriweather Variable", ${serif}` },
  {
    id: "atkinson",
    name: "Atkinson Hyperlegible",
    family: `"Atkinson Hyperlegible Next Variable", ${sans}`,
  },
  { id: "inter", name: "Inter", family: `"Inter Variable", ${sans}` },
] as const;

export type ReadingFont = (typeof readingFonts)[number]["id"];
const fontCookie = "still-font";

export function isReadingFont(value: string | undefined): value is ReadingFont {
  return readingFonts.some((font) => font.id === value);
}

function parseReadingFont(value: string | undefined): ReadingFont {
  return isReadingFont(value) ? value : "source-serif";
}

export function readingFontFamily(id: ReadingFont) {
  return readingFonts.find((font) => font.id === id)!.family;
}

export const readReadingFont = createIsomorphicFn()
  .server(() => parseReadingFont(getCookie(fontCookie)))
  .client(() => parseReadingFont(readBrowserCookie(fontCookie)));

export function saveReadingFont(font: ReadingFont) {
  saveCookie(fontCookie, font);
}
