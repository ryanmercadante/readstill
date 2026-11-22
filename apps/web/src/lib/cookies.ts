/** Reads a cookie in the browser; undefined when it is missing or cookies are blocked. */
export function readBrowserCookie(name: string) {
  try {
    return document.cookie
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${name}=`))
      ?.slice(name.length + 1);
  } catch {
    return undefined;
  }
}

/** Stores a site-wide preference for one year. */
export function saveCookie(name: string, value: string) {
  try {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${name}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  } catch {
    // Keep the current page usable if the browser blocks cookies.
  }
}
