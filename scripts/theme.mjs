import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = process.argv[2] || "http://127.0.0.1:5173";
const browser = await chromium.launch();
const errors = [];
await mkdir(".impeccable/review", { recursive: true });
const observe = (page) => {
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
};
const ready = (page) => page.waitForLoadState("networkidle");
const themeIs = async (page, theme) => {
  await page.waitForFunction((value) => document.documentElement.dataset.theme === value, theme);
  assert.equal(
    await page.locator("html").evaluate((node) => getComputedStyle(node).colorScheme),
    theme,
  );
  assert.equal(
    await page.getByRole("button", { name: "Dark mode", exact: true }).getAttribute("aria-pressed"),
    String(theme === "dark"),
  );
  assert.equal(
    await page.locator('meta[name="theme-color"]').getAttribute("content"),
    theme === "dark" ? "#211f1b" : "#f7f5ef",
  );
};
try {
  const context = await browser.newContext({
    colorScheme: "dark",
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  observe(page);
  await page.goto(baseUrl);
  await ready(page);
  // The system is dark, but new visitors explicitly default to light.
  await themeIs(page, "light");
  const toggle = page.getByRole("button", { name: "Dark mode", exact: true });
  await toggle.focus();
  await page.keyboard.press("Space");
  await themeIs(page, "dark");
  const cookie = (await context.cookies()).find((item) => item.name === "still-theme");
  assert.equal(cookie?.value, "dark");
  assert.equal(cookie?.path, "/");
  assert.equal(cookie?.sameSite, "Lax");
  await page.reload();
  await ready(page);
  await themeIs(page, "dark");
  await page.getByRole("link", { name: "Try it", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector(".paste-button")?.disabled);
  await themeIs(page, "dark");
  await page.locator('[data-word="4"]').click();
  await toggle.click();
  await themeIs(page, "light");
  assert.equal(await page.locator('[aria-current="location"]').getAttribute("data-word"), "4");
  await page.reload();
  await ready(page);
  await themeIs(page, "light");

  // Inspect raw responses so the cookie is proven to affect server-rendered HTML.
  for (const [cookieValue, expected] of [
    ["dark", "dark"],
    ["light", "light"],
    ["invalid", "light"],
    ["", "light"],
  ]) {
    for (const route of ["/", "/reader?sample=true"]) {
      const response = await browser.newContext();
      const html = await (
        await response.request.get(new URL(route, baseUrl).href, {
          headers: { Cookie: cookieValue ? `still-theme=${cookieValue}` : "" },
        })
      ).text();
      assert.match(html, new RegExp(`<html[^>]*data-theme="${expected}"`));
      assert.match(
        html,
        new RegExp(`aria-label="Dark mode" aria-pressed="${expected === "dark"}"`),
      );
      await response.close();
    }
  }

  // Capture both themes and verify the complete header stays usable on a small phone.
  for (const theme of ["light", "dark"]) {
    if ((await page.locator("html").getAttribute("data-theme")) !== theme) await toggle.click();
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: width === 320 ? 568 : 1000 });
      for (const route of ["/", "/reader?sample=true"]) {
        await page.goto(new URL(route, baseUrl).href);
        await ready(page);
        await themeIs(page, theme);
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${theme} ${route} overflows at ${width}px`,
        );
        const buttons = await page.locator("header button").evaluateAll((nodes) =>
          nodes.map((node) => {
            const r = node.getBoundingClientRect();
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
          }),
        );
        for (let i = 0; i < buttons.length; i++) {
          assert.ok(buttons[i].left >= 0 && buttons[i].right <= width);
          if (i) assert.ok(buttons[i].left >= buttons[i - 1].right, "Header buttons overlap");
        }
        await page.screenshot({
          path: `.impeccable/review/theme-${theme}-${route === "/" ? "landing" : "article"}-${width}.png`,
          fullPage: true,
        });
        if (route === "/reader?sample=true") {
          await page.getByRole("button", { name: "Focus", exact: true }).click();
          await page.waitForFunction(
            () => !document.querySelector(".view-switch button")?.disabled,
          );
          await page.screenshot({ path: `.impeccable/review/theme-${theme}-focus-${width}.png` });
          await page.getByRole("button", { name: "Paste text", exact: true }).click();
          await page.getByRole("dialog").waitFor();
          await page.screenshot({ path: `.impeccable/review/theme-${theme}-dialog-${width}.png` });
          await page.getByRole("button", { name: "Close paste dialog" }).click();
          await page.getByRole("dialog").waitFor({ state: "hidden" });
        }
      }
    }
  }
  await context.close();

  // Disable JavaScript entirely: a saved cookie must still render dark.
  const early = await browser.newContext({ javaScriptEnabled: false, colorScheme: "light" });
  await early.addCookies([{ name: "still-theme", value: "dark", url: baseUrl }]);
  const initial = await early.newPage();
  await initial.goto(baseUrl);
  assert.equal(await initial.locator("html").getAttribute("data-theme"), "dark");
  assert.equal(
    await initial.locator("html").evaluate((node) => getComputedStyle(node).backgroundColor),
    "rgb(33, 31, 27)",
  );
  await early.close();

  // Blocked cookies must not prevent a manual choice or client navigation.
  const blocked = await browser.newContext({ colorScheme: "dark" });
  await blocked.addInitScript(() => {
    Object.defineProperty(document, "cookie", {
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
    });
  });
  const privatePage = await blocked.newPage();
  observe(privatePage);
  await privatePage.goto(baseUrl);
  await ready(privatePage);
  await themeIs(privatePage, "light");
  await privatePage.getByRole("button", { name: "Dark mode", exact: true }).click();
  await themeIs(privatePage, "dark");
  await privatePage.getByRole("link", { name: "Try it", exact: true }).click();
  await privatePage.waitForFunction(() => !document.querySelector(".paste-button")?.disabled);
  await themeIs(privatePage, "dark");
  await blocked.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: light default, keyboard toggle, cookie persistence, navigation, preserved position, blocked cookies, server-rendered themes without JavaScript, and desktop/mobile layouts in both themes.",
  );
} finally {
  await browser.close();
}
