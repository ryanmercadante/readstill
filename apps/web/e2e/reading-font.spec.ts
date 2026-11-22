import { test, expect } from "./fixtures/test";
import type { Page } from "@playwright/test";

async function fontIs(page: Page, id: string, family: string) {
  await expect(page.locator("html")).toHaveAttribute("data-font", id);
  await expect(page.locator("article").first()).toHaveCSS(
    "font-family",
    new RegExp(`^"?${family}`),
  );
}

test("choosing a font restyles the reading, persists a cookie, and keeps the word", async ({
  page,
  app,
  context,
}) => {
  await app.sample();
  await fontIs(page, "source-serif", "Source Serif 4 Variable");
  await app.seek(4);
  await app.button("Reading font").click();
  const literata = page.getByRole("menuitemradio", { name: "Literata", exact: true });
  await literata.click();
  await expect(literata).toHaveAttribute("aria-checked", "true");
  // The menu stays open so readers can compare faces.
  await expect(page.getByRole("menu", { name: "Reading font", exact: true })).toBeVisible();
  await fontIs(page, "literata", "Literata Variable");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS(
    "font-family",
    /^"?Literata Variable/,
  );
  expect((await context.cookies()).find((cookie) => cookie.name === "still-font")).toMatchObject({
    value: "literata",
    path: "/",
    sameSite: "Lax",
  });
  await page.keyboard.press("Escape");
  await expect(app.activeWord).toHaveAttribute("data-word", "4");
  await page.reload();
  await app.readerReady();
  await fontIs(page, "literata", "Literata Variable");
});

test("a wide font still fits long Focus words on a phone", async ({
  page,
  app,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "still-font", value: "merriweather", url: baseURL! }]);
  await app.emptyLibrary();
  await app.paste("Incomprehensibilities notwithstanding, read on.", "Long words");
  await app.mode("Focus");
  await page.setViewportSize({ width: 320, height: 568 });
  await page.evaluate(() => document.fonts.ready);
  const word = page.getByTestId("focus-word");
  await expect(word).toHaveCSS("font-family", /^"?Merriweather Variable/);
  await expect
    .poll(() =>
      word.evaluate((node) => {
        const box = node.getBoundingClientRect();
        return box.left >= 0 && box.right <= innerWidth;
      }),
    )
    .toBe(true);
});

test("phones pick from the same menu beside the view switch", async ({ page, app }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await app.sample();
  await app.button("Reading font").click();
  await page.getByRole("menuitemradio", { name: "Atkinson Hyperlegible", exact: true }).click();
  await fontIs(page, "atkinson", "Atkinson Hyperlegible Next Variable");
});

for (const [cookie, font] of [
  ["inter", "inter"],
  ["charis", "charis"],
  ["invalid", "source-serif"],
  ["", "source-serif"],
]) {
  test(`server font for ${cookie || "missing"} cookie`, async ({ request }) => {
    for (const route of ["/", "/reader?sample=true"]) {
      const response = await request.get(route, {
        headers: { Cookie: cookie ? `still-font=${cookie}` : "" },
      });
      expect(await response.text()).toMatch(new RegExp(`<html[^>]*data-font="${font}"`));
    }
  });
}

test("blocked cookies still allow choosing a font for the session", async ({ page, app }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "cookie", {
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
    });
  });
  await app.sample();
  await app.button("Reading font").click();
  await page.getByRole("menuitemradio", { name: "Newsreader", exact: true }).click();
  await fontIs(page, "newsreader", "Newsreader Variable");
});

test("the picker sits with the reading, not in the navbar", async ({ page, app }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Reading font", exact: true })).toHaveCount(0);
    await app.sample();
    await app.openMenu();
    await expect(page.getByRole("banner").getByText("Reading font")).toHaveCount(0);
    await expect(
      page
        .getByRole("region", { name: "Reading details" })
        .getByRole("button", { name: "Reading font", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
  }
});
