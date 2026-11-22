import { test, expect } from "./fixtures/test";
import type { Page } from "@playwright/test";

async function themeIs(page: Page, theme: string) {
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await expect(page.locator("html")).toHaveCSS("color-scheme", theme);
  await expect(page.getByRole("button", { name: "Dark mode", exact: true })).toHaveAttribute(
    "aria-pressed",
    String(theme === "dark"),
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    theme === "dark" ? "#211f1b" : "#f7f5ef",
  );
}
test("light is the default even when the OS prefers dark", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await themeIs(page, "light");
});
test("keyboard toggling persists a cookie across reload and client navigation without moving the word", async ({
  page,
  app,
  context,
}) => {
  await app.sample();
  await app.seek(4);
  await app.button("Dark mode").focus();
  await page.keyboard.press("Space");
  await themeIs(page, "dark");
  expect((await context.cookies()).find((cookie) => cookie.name === "still-theme")).toMatchObject({
    value: "dark",
    path: "/",
    sameSite: "Lax",
  });
  await expect(app.activeWord).toHaveAttribute("data-word", "4");
  await page.reload();
  await app.readerReady();
  await themeIs(page, "dark");
  await page.getByRole("link", { name: "Still home", exact: true }).click();
  await expect(page.getByRole("link", { name: "Try it", exact: true })).toBeVisible();
  await themeIs(page, "dark");
  await page.getByRole("link", { name: "Try it", exact: true }).click();
  await app.readerReady();
  await themeIs(page, "dark");
  await app.button("Dark mode").click();
  await themeIs(page, "light");
  await page.reload();
  await app.readerReady();
  await themeIs(page, "light");
});
for (const [cookie, theme] of [
  ["dark", "dark"],
  ["light", "light"],
  ["invalid", "light"],
  ["", "light"],
]) {
  test(`server theme for ${cookie || "missing"} cookie`, async ({ request }) => {
    for (const route of ["/", "/reader?sample=true"]) {
      const response = await request.get(route, {
        headers: { Cookie: cookie ? `still-theme=${cookie}` : "" },
      });
      const html = await response.text();
      expect(html).toMatch(new RegExp(`<html[^>]*data-theme="${theme}"`));
      expect(html).toContain(`aria-label="Dark mode" aria-pressed="${theme === "dark"}"`);
    }
  });
}
test.describe("before JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("dark mode and the landing link render correctly", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "still-theme", value: "dark", url: baseURL! }]);
    await page.goto("/");
    await themeIs(page, "dark");
    await expect(page.locator("html")).toHaveCSS("background-color", "oklch(0.24 0.008 84.6)");
    await page.getByRole("link", { name: "Try it", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "The pleasure of paying attention",
    );
  });
});
test("blocked cookies still allow session theme changes and navigation", async ({ page, app }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "cookie", {
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
    });
  });
  await app.sample();
  await themeIs(page, "light");
  await app.button("Dark mode").click();
  await themeIs(page, "dark");
  await app.library();
  await themeIs(page, "dark");
});
