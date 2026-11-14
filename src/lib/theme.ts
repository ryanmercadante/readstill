import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

export type Theme = "light" | "dark";
const themeCookie = "still-theme";
export const themeColors = { light: "#f7f5ef", dark: "#211f1b" };

function parseTheme(value: string | undefined): Theme {
  return value === "dark" ? "dark" : "light";
}

export const readTheme = createIsomorphicFn()
  .server(() => parseTheme(getCookie(themeCookie)))
  .client(() => {
    try {
      return parseTheme(
        document.cookie
          .split(";")
          .map((cookie) => cookie.trim())
          .find((cookie) => cookie.startsWith(`${themeCookie}=`))
          ?.slice(themeCookie.length + 1),
      );
    } catch {
      return "light" as const;
    }
  });

export function saveTheme(theme: Theme) {
  try {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${themeCookie}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  } catch {
    // Keep the current page usable if the browser blocks cookies.
  }
}
