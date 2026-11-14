import { test, expect, freezeTime } from "./fixtures/test";

test("Guided plays in the article, follows the highlight, and tapping a word pauses", async ({
  page,
  app,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await app.sample();
  await app.mode("Guided");
  await app.seek(60);
  await page.getByRole("slider").fill("700");
  const beforeScroll = await page.evaluate(() => scrollY);
  await app.button("Read passage").click();
  await expect
    .poll(async () => Number(await app.activeWord.getAttribute("data-word")), { timeout: 15_000 })
    .toBeGreaterThanOrEqual(95);
  await app.button("Pause reading").click();
  await expect(page.getByRole("article")).toBeVisible();
  await expect(page.getByTestId("focus-word")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const word = document.querySelector('[aria-current="location"]')!.getBoundingClientRect();
        const header = document.querySelector("header")!.getBoundingClientRect();
        const dock = document.querySelector(".reader-dock")!.getBoundingClientRect();
        return word.top >= header.bottom && word.bottom <= dock.top;
      }),
    )
    .toBe(true);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(beforeScroll);
  const selected = await app.activeWord.getAttribute("data-word");
  await app.mode("Focus");
  await app.mode("Guided");
  await expect(app.activeWord).toHaveAttribute("data-word", selected!);
  await page.getByRole("article").focus();
  await page.keyboard.press("Space");
  await expect(app.button("Pause reading")).toBeVisible();
  await app.seek(4);
  await expect(app.button("Read passage")).toBeVisible();
  await expect(app.activeWord).toHaveAttribute("data-word", "4");
});
test("Article and Guided share a surface without a transition or autoplay", async ({
  page,
  app,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await app.sample();
  await app.seek(4);
  await freezeTime(page);
  for (const mode of ["Guided", "Article", "Guided"] as const) {
    await app.button(mode).click();
    await page.clock.runFor(32);
    await expect(app.button(mode)).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("word-flight")).toHaveCount(0);
    await app.readerReady();
    await expect(app.activeWord).toHaveText("bookshop");
    await expect(app.button("Read passage")).toBeVisible();
  }
});
