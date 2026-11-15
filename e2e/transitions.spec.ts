import { test, expect, freezeTime, hidePage } from "./fixtures/test";

test.use({ reducedMotion: "no-preference" });
for (const interruption of [
  "About this reader",
  "Keyboard shortcuts",
  "Menu",
  "hidden tab",
] as const) {
  test(`opening ${interruption} during the word flight cancels pending autoplay`, async ({
    page,
    app,
  }) => {
    if (interruption === "Menu") await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.install();
    await app.sample();
    await freezeTime(page);
    await app.button("Read passage").click();
    await page.clock.runFor(32);
    await expect(page.getByTestId("word-flight")).toBeVisible();
    if (interruption === "hidden tab") await hidePage(page, true);
    else await app.button(interruption).click();
    await page.clock.runFor(1000);
    if (interruption === "hidden tab") await hidePage(page, false);
    else {
      await expect(page.getByRole(interruption === "Menu" ? "menu" : "dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await page.clock.runFor(300);
      await expect(page.getByRole(interruption === "Menu" ? "menu" : "dialog")).toHaveCount(0);
    }
    await page.clock.runFor(2000);
    await app.readerReady();
    await expect(page.getByTestId("focus-word")).toHaveText("There");
    await expect(app.button("Read passage")).toBeVisible();
  });
}
test("closing the legend before the flight finishes does not re-arm autoplay", async ({
  page,
  app,
}) => {
  await page.clock.install();
  await app.sample();
  await freezeTime(page);
  await app.button("Read passage").click();
  await page.clock.runFor(32);
  await expect(page.getByTestId("word-flight")).toBeVisible();
  await app.button("Keyboard shortcuts").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("word-flight")).toBeVisible();
  await page.clock.runFor(2000);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("focus-word")).toHaveText("There");
  await expect(app.button("Read passage")).toBeVisible();
});
test("normal animation connects the selected word and keeps its anchor centered", async ({
  app,
  page,
}) => {
  await app.sample();
  await app.seek(4);
  await app.mode("Focus");
  await expect(page.getByTestId("focus-word")).toHaveText("bookshop");
  for (let i = 0; i < 8; i++) {
    await expect
      .poll(() =>
        page.evaluate(() => {
          const letter = document
            .querySelector(".focus-word .anchor-letter")!
            .getBoundingClientRect();
          const stage = document.querySelector(".focus-stage")!.getBoundingClientRect();
          return Math.abs(letter.left + letter.width / 2 - stage.left - stage.width / 2);
        }),
      )
      .toBeLessThan(1);
    await app.button("Next word").click();
  }
  await app.mode("Article");
  await expect(app.activeWord).toHaveAttribute("data-word", "12");
});
