import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { readBrowserCookie, saveCookie } from "./cookies";

export type Theme = "light" | "dark";
const themeCookie = "still-theme";
// Hex equivalents of --paper in styles.css; theme-color meta support for oklch() is uneven.
export const themeColors = { light: "#f7f5ef", dark: "#211f1b" };

function parseTheme(value: string | undefined): Theme {
  return value === "dark" ? "dark" : "light";
}

export const readTheme = createIsomorphicFn()
  .server(() => parseTheme(getCookie(themeCookie)))
  .client(() => parseTheme(readBrowserCookie(themeCookie)));

export function saveTheme(theme: Theme) {
  saveCookie(themeCookie, theme);
}
