import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const baseUrl = process.argv[2] || "http://127.0.0.1:5173";
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const button = (name) => page.getByRole("button", { name, exact: true });
const dialog = () => page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true });
const ready = () =>
  page.waitForFunction(() => document.querySelector(".view-switch button")?.disabled === false);
const position = () => page.locator('[aria-current="location"]').getAttribute("data-word");
const audit = async () => {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  assert.deepEqual(
    result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    [],
  );
};
const closeLegend = async () => {
  await page.keyboard.press("Escape");
  await dialog().waitFor({ state: "hidden" });
  await page.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "Keyboard shortcuts",
  );
};
try {
  await mkdir(".impeccable/review", { recursive: true });
  for (const route of ["/", "/library", "/reader?sample=true"]) {
    await page.goto(new URL(route, baseUrl).href);
    await button("Keyboard shortcuts").click();
    await dialog().waitFor();
    await closeLegend();
  }
  await ready();
  assert.equal(await page.locator(".reader-dock kbd").count(), 0);
  await page.keyboard.press("?");
  await dialog().waitFor();
  await audit();
  await page.screenshot({ path: ".impeccable/review/shortcuts-desktop.png" });
  await closeLegend();

  await button("Guided").click();
  await page.locator('[data-word="4"]').click();
  await button("Read passage").click();
  await button("Pause reading").waitFor();
  await page.keyboard.press("?");
  await dialog().waitFor();
  const paused = await position();
  await dialog().focus();
  for (const key of ["ArrowRight", "ArrowLeft", "r", "Space"]) await page.keyboard.press(key);
  await page.waitForTimeout(400);
  assert.equal(await position(), paused, "Dialog keys must not operate the reader");
  assert.equal(await button("Pause reading").count(), 0);
  // Tab must stay inside the modal, including its scrollable content.
  for (const key of ["Tab", "Tab", "Shift+Tab"]) {
    await page.keyboard.press(key);
    await page.waitForFunction(() =>
      document.querySelector('[role="dialog"]')?.contains(document.activeElement),
    );
  }
  await closeLegend();
  assert.equal(await position(), paused);
  assert.equal(await button("Read passage").count(), 1);

  await button("Article").click();
  await page.evaluate(() => {
    document.querySelector(".play-button").click();
    document.querySelector('[aria-label="Keyboard shortcuts"]').click();
  });
  await dialog().waitFor();
  await closeLegend();
  await ready();
  await page.waitForTimeout(500);
  assert.equal(
    await button("Pause reading").count(),
    0,
    "Opening then closing the legend must cancel pending autoplay",
  );
  assert.equal(await page.locator("#reading").getAttribute("data-view"), "focus");

  await button("Paste text").click();
  const text = page.getByLabel("Your text", { exact: true });
  await text.fill("Do shortcuts work while typing");
  await text.press("End");
  await text.press("?");
  assert.match(await text.inputValue(), /\?$/);
  assert.equal(await dialog().count(), 0);
  await button("Close paste dialog").focus();
  await page.keyboard.press("?");
  assert.equal(await dialog().count(), 0, "The legend must not open over another dialog");
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });

  const slider = page.getByRole("slider");
  await slider.fill("300");
  await slider.focus();
  await page.keyboard.press("PageUp");
  assert.equal(await slider.inputValue(), "400");
  await page.keyboard.press("PageDown");
  assert.equal(await slider.inputValue(), "300");
  await page.keyboard.press("Shift+ArrowUp");
  assert.equal(await slider.inputValue(), "400");
  await page.keyboard.press("Shift+ArrowDown");
  assert.equal(await slider.inputValue(), "300");
  await button("Guided").focus();
  await page.keyboard.press("Home");
  assert.ok(await button("Article").evaluate((node) => node === document.activeElement));
  await page.keyboard.press("End");
  assert.ok(await button("Focus").evaluate((node) => node === document.activeElement));

  for (const width of [1024, 768, 520, 390, 320]) {
    await page.setViewportSize({ width, height: width <= 520 ? 568 : 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Overflow at ${width}px`,
    );
    const controls = await page.locator("header a, header button").evaluateAll((nodes) =>
      nodes.map((node) => {
        const r = node.getBoundingClientRect();
        return { left: r.left, right: r.right };
      }),
    );
    for (let i = 0; i < controls.length; i++) {
      assert.ok(
        controls[i].left >= 0 && controls[i].right <= width,
        `Header action clipped at ${width}px`,
      );
      if (i)
        assert.ok(
          controls[i].left >= controls[i - 1].right,
          `Header controls overlap at ${width}px`,
        );
    }
  }
  await page.screenshot({ path: ".impeccable/review/shortcuts-header-mobile.png" });
  await button("Keyboard shortcuts").click();
  await dialog().waitFor();
  await audit();
  assert.ok(await dialog().evaluate((node) => node.scrollWidth <= node.clientWidth));
  await page.screenshot({ path: ".impeccable/review/shortcuts-mobile.png" });
  await page.getByRole("region", { name: "Chapters", exact: true }).scrollIntoViewIfNeeded();
  assert.ok(await page.getByText("Move through chapters", { exact: true }).isVisible());
  await closeLegend();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: shared legend, ? shortcut, pause and canceled autoplay, dialog isolation/focus trap/return, typing guards, documented control keys, responsive navbar, and desktop/mobile accessibility.",
  );
} finally {
  await browser.close();
}
