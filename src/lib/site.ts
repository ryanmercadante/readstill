/**
 * Absolute origin for link previews, which crawlers only follow as full URLs.
 * Self-hosted copies set VITE_SITE_URL at build time.
 */
export const siteUrl = String(import.meta.env.VITE_SITE_URL || "https://readstill.app").replace(
  /\/+$/,
  "",
);
