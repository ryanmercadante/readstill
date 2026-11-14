import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = process.argv[2] || "http://127.0.0.1:5173";
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const mode = (name) => page.getByRole("button", { name, exact: true });
const position = async () =>
  Number(await page.locator('[aria-current="location"]').getAttribute("data-word"));
const settled = () =>
  page.waitForFunction(() => document.querySelector(".view-switch button")?.disabled === false);
const visibleWord = () =>
  page.evaluate(() => {
    const word = document.querySelector('[aria-current="location"]').getBoundingClientRect();
    const header = document.querySelector("header").getBoundingClientRect();
    const dock = document.querySelector(".reader-dock").getBoundingClientRect();
    return word.top >= header.bottom && word.bottom <= dock.top;
  });
try {
  await mkdir(".impeccable/review", { recursive: true });
  await page.goto(new URL("/reader?sample=true", baseUrl).href);
  await settled();
  await page.locator('[data-word="4"]').click();
  await mode("Guided").click();
  assert.equal(await page.locator("#reading").getAttribute("data-view"), "guided");
  assert.equal(await position(), 4);
  assert.equal(await page.locator(".flying-word").count(), 0);
  assert.equal(await page.getByRole("article").count(), 1);
  await page.getByRole("slider").fill("700");
  await mode("Read passage").click();
  await page.waitForFunction(
    () =>
      Number(document.querySelector('[aria-current="location"]')?.getAttribute("data-word")) > 7,
  );
  await mode("Pause reading").click();
  const paused = await position();
  await page.waitForTimeout(350);
  assert.equal(await position(), paused);
  assert.equal(await page.getByTestId("focus-word").count(), 0);
  await page.screenshot({ path: ".impeccable/review/guided-desktop.png", fullPage: true });

  // Keyboard playback and tapping a word use the same shared position and pause state.
  await page.getByRole("article").focus();
  await page.keyboard.press("Space");
  await mode("Pause reading").waitFor();
  await page.locator('[data-word="4"]').click();
  await mode("Read passage").waitFor();
  assert.equal(await position(), 4);
  await mode("Article").click();
  assert.equal(await position(), 4);
  assert.equal(await page.locator(".flying-word").count(), 0);
  await mode("Guided").click();
  await mode("Focus").click();
  await settled();
  assert.equal(await page.getByTestId("focus-word").textContent(), "bookshop");
  await mode("Read passage").waitFor();
  await mode("Guided").click();
  await settled();
  assert.equal(await position(), 4);

  // On a short phone, the highlight must scroll between the sticky header and dock.
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator('[data-word="60"]').click();
  const beforeScroll = await page.evaluate(() => scrollY);
  await mode("Read passage").click();
  await page.waitForFunction(
    () =>
      Number(document.querySelector('[aria-current="location"]')?.getAttribute("data-word")) >= 95,
  );
  await mode("Pause reading").click();
  assert.ok(await visibleWord(), "Playing word is obscured by the header or dock");
  assert.ok(
    (await page.evaluate(() => scrollY)) > beforeScroll,
    "Guided playback must follow the passage down the page",
  );
  await page.screenshot({ path: ".impeccable/review/guided-mobile.png" });
  const sharedPosition = await position();
  await mode("Focus").click();
  await settled();
  await mode("Guided").click();
  await settled();
  assert.equal(await position(), sharedPosition);
  assert.equal(await page.locator(".flying-word").count(), 0);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await mode("Paste text").click();
  await page.getByLabel("Title (optional)").fill("Guided completion");
  await page.getByLabel("Your text", { exact: true }).fill("One last word.");
  await mode("Start reading").click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await mode("Guided").click();
  await mode("Read passage").click();
  await mode("Read again").waitFor();
  assert.equal(await position(), 2);
  assert.equal(await page.getByRole("progressbar").getAttribute("aria-valuenow"), "100");
  assert.equal(await page.locator("#reading").getAttribute("data-view"), "guided");
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="save-status"]')?.textContent === "Saved on this device",
  );
  await page.reload();
  await settled();
  assert.equal(await position(), 2, "Guided progress must persist for a saved reading");
  await mode("Guided").click();
  await page.getByRole("slider").fill("100");
  await mode("Read again").click();
  await mode("Pause reading").click();
  assert.equal(await position(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: Guided playback, pause, keyboard/tap controls, shared position across three modes, desktop/mobile scrolling, reduced motion, completion, replay, and saved progress.",
  );
} finally {
  await browser.close();
}
