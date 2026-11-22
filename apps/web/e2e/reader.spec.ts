import { test, expect, freezeTime, hidePage } from "./fixtures/test";
import { passage } from "./fixtures/books";

test.beforeEach(async ({ page, app }) => {
  await page.clock.install();
  await app.sample();
});
for (const mode of ["Article", "Guided", "Focus"] as const) {
  test(`${mode}: play advances, pause holds position, and stepping stays paused`, async ({
    page,
    app,
  }) => {
    await app.mode(mode);
    await freezeTime(page);
    await app.button("Read passage").click();
    await page.clock.runFor(1000);
    await expect(app.button(mode === "Article" ? "Focus" : mode)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(app.button("Pause reading")).toBeVisible();
    // Article starts playback after React commits the Focus transition. Advance
    // again after that observable boundary so its new timer actually runs.
    await page.clock.runFor(1000);
    const current = mode === "Guided" ? app.activeWord : page.getByTestId("focus-word");
    await expect(current).not.toHaveText("There");
    await app.button("Pause reading").click();
    const paused = await current.textContent();
    await page.clock.runFor(2000);
    await expect(current).toHaveText(paused!);
    await app.button("Next word").click();
    await expect(app.button("Read passage")).toBeVisible();
    await app.mode("Article", true);
    const next = Number(await app.activeWord.getAttribute("data-word"));
    await app.button("Previous word").click();
    await expect(app.activeWord).toHaveAttribute("data-word", String(next - 1));
  });
}
test("all mode changes preserve the selected word without autoplay", async ({ page, app }) => {
  await app.seek(4);
  await freezeTime(page);
  for (const mode of ["Guided", "Focus", "Guided", "Article", "Focus", "Article"] as const) {
    await app.mode(mode, true);
    await page.clock.runFor(1000);
    await expect(app.button("Read passage")).toBeVisible();
    await expect(mode === "Focus" ? page.getByTestId("focus-word") : app.activeWord).toHaveText(
      "bookshop",
    );
  }
});
test("switching mode during playback pauses at the shared position", async ({ page, app }) => {
  await app.mode("Guided");
  await freezeTime(page);
  await app.button("Read passage").click();
  await page.clock.runFor(1000);
  const word = await app.activeWord.textContent();
  await app.mode("Focus", true);
  await page.clock.runFor(2000);
  await expect(page.getByTestId("focus-word")).toHaveText(word!);
  await expect(app.button("Read passage")).toBeVisible();
});
test("sentence replay, pace, and selected word survive a reload", async ({ page, app }) => {
  await app.paste(passage);
  await app.seek(7);
  await app.button("Replay sentence").click();
  await expect(app.activeWord).toHaveAttribute("data-word", "4");
  await page.getByRole("slider").fill("400");
  await app.saved();
  await page.reload();
  await app.readerReady();
  await expect(app.activeWord).toHaveAttribute("data-word", "4");
  await expect(page.getByRole("slider")).toHaveValue("400");
});
for (const mode of ["Guided", "Focus"] as const) {
  test(`${mode}: completion is saved and Read again restarts`, async ({ page, app }) => {
    await app.paste("One last word.", "Short reading");
    await app.mode(mode);
    await page.getByRole("slider").fill("700");
    await app.button("Read passage").click();
    await expect(app.button("Read again")).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    await app.saved();
    await page.reload();
    await app.readerReady();
    await expect(app.activeWord).toHaveAttribute("data-word", "2");
    await app.mode(mode);
    await freezeTime(page);
    await app.button("Read again").click();
    await expect(app.button("Pause reading")).toBeVisible();
    await expect(mode === "Focus" ? page.getByTestId("focus-word") : app.activeWord).toHaveText(
      "One",
    );
  });
}
test("hiding the page pauses playback and returning does not resume it", async ({ page, app }) => {
  await app.mode("Guided");
  await freezeTime(page);
  await app.button("Read passage").click();
  await page.clock.runFor(500);
  await hidePage(page, true);
  const paused = await app.activeWord.textContent();
  await page.clock.runFor(2000);
  await hidePage(page, false);
  await page.clock.runFor(1000);
  await expect(app.activeWord).toHaveText(paused!);
  await expect(app.button("Read passage")).toBeVisible();
});
test("leaving the reader pauses playback and preserves the saved position", async ({
  page,
  app,
}) => {
  await app.paste(passage);
  await app.mode("Guided");
  await freezeTime(page);
  await app.button("Read passage").click();
  await page.clock.runFor(800);
  const paused = await app.activeWord.getAttribute("data-word");
  await app.library();
  await page.clock.runFor(2000);
  await app.button("Continue reading").click();
  await app.readerReady();
  await expect(app.activeWord).toHaveAttribute("data-word", paused!);
  await expect(app.button("Read passage")).toBeVisible();
});
test("selecting prose does not change the reading position", async ({ page, app }) => {
  await app.seek(4);
  await page
    .locator("article p")
    .first()
    .evaluate((paragraph) => {
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    });
  // A click following a drag selection must not seek; a normal subsequent click does.
  await page.locator('[data-word="8"]').dispatchEvent("click");
  await expect(app.activeWord).toHaveAttribute("data-word", "4");
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await app.seek(8);
  await expect(app.activeWord).toHaveAttribute("data-word", "8");
});
