import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const baseUrl = process.argv[2] || "http://127.0.0.1:5173";
const browser = await chromium.launch();
const errors = [];
const failures = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const audit = async (state) => {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    failures.push(
      ...result.violations.map((violation) => ({
        state,
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.map((node) => node.target),
      })),
    );
  };
  const settled = () =>
    page.waitForFunction(
      () => !document.querySelector(".view-switch button")?.disabled,
    );
  const assertTrapped = async () => {
    for (const key of [
      ...Array(8).fill("Tab"),
      ...Array(8).fill("Shift+Tab"),
    ]) {
      await page.keyboard.press(key);
      // Base UI redirects its focus guards on the next frame.
      await page.waitForFunction(
        () =>
          document
            .querySelector('[role="dialog"]')
            ?.contains(document.activeElement),
        undefined,
        { timeout: 2000 },
      );
    }
  };
  const assertReturned = () =>
    page.waitForFunction(() => document.activeElement?.matches(".play-button"));

  await page.goto(baseUrl);
  await page.waitForLoadState("networkidle");
  await audit("landing desktop");
  const cta = page.getByRole("link", { name: "Try it", exact: true });
  await cta.focus();
  await page.keyboard.press("Enter");
  await settled();
  await audit("article desktop");

  const articleToggle = page.getByRole("button", {
    name: "Article",
    exact: true,
  });
  const focusToggle = page.getByRole("button", { name: "Focus", exact: true });
  await articleToggle.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await focusToggle.evaluate((node) => node === document.activeElement),
    true,
  );
  await page.keyboard.press("Space");
  await settled();
  assert.equal(await focusToggle.getAttribute("aria-pressed"), "true");
  assert.equal(
    await page
      .getByRole("button", { name: "Read passage", exact: true })
      .count(),
    1,
    "Changing view must not start playback",
  );
  await page.keyboard.press("Space");
  assert.equal(
    await focusToggle.getAttribute("aria-pressed"),
    "true",
    "One reading view must remain selected",
  );

  const slider = page.getByRole("slider");
  assert.match(await slider.getAttribute("aria-labelledby"), /pace-label/);
  await slider.focus();
  await page.keyboard.press("Home");
  assert.equal(await slider.inputValue(), "100");
  await page.keyboard.press("ArrowRight");
  assert.equal(await slider.inputValue(), "125");
  await page.keyboard.press("End");
  assert.equal(await slider.inputValue(), "700");
  assert.equal(
    await slider.getAttribute("aria-valuetext"),
    "700 words per minute",
  );
  assert.equal(
    await page.getByTestId("focus-word").textContent(),
    "There",
    "Slider keys must not seek the passage",
  );
  await audit("focus desktop");

  await page.getByRole("button", { name: "Paste text", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Something worth reading." })
    .waitFor();
  await audit("paste dialog desktop");
  await assertTrapped();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Start reading", exact: true })
    .click();
  assert.equal(
    await page
      .getByLabel("Your text", { exact: true })
      .getAttribute("aria-invalid"),
    "true",
  );
  assert.match(
    await page
      .getByLabel("Your text", { exact: true })
      .getAttribute("aria-describedby"),
    /paste-error/,
  );
  await audit("paste validation desktop");
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await assertReturned();

  await page.getByRole("button", { name: "About this reader" }).click();
  await page.getByRole("dialog", { name: "A little more focus." }).waitFor();
  await audit("about dialog desktop");
  await assertTrapped();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await assertReturned();

  await page.setViewportSize({ width: 390, height: 844 });
  await audit("focus mobile");
  await articleToggle.click();
  await settled();
  await audit("article mobile");
  for (const name of ["Paste text", "About this reader"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.getByRole("dialog").waitFor();
    await audit(`${name} mobile`);
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
  }
  await page.getByRole("link", { name: "Still home" }).click();
  await page.getByRole("link", { name: "Try it", exact: true }).waitFor();
  await audit("landing mobile");
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, [], JSON.stringify(failures, null, 2));
  console.log(
    "PASS: WCAG A/AA axe scans across desktop/mobile landing, article, focus and dialogs; keyboard navigation, single view selection, pace keys, dialog focus traps, focus return and validation semantics.",
  );
} finally {
  await browser.close();
}
