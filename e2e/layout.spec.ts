import { test, expect, freezeTime } from "./fixtures/test";

for (const theme of ["light", "dark"]) {
  test(`${theme}: navbar controls fit from 320px through desktop`, async ({ page, app }) => {
    await app.sample();
    if (theme === "dark") await app.button("Dark mode").click();
    await page.evaluate(() => document.fonts.ready);
    for (const route of ["/", "/library", "/reader?sample=true"]) {
      await page.goto(route);
      for (const width of [1440, 1024, 768, 520, 390, 320]) {
        await test.step(`${route} at ${width}px`, async () => {
          await page.setViewportSize({ width, height: width <= 520 ? 568 : 1000 });
          await page.evaluate(() => window.scrollTo(0, 0));
          await expect
            .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
            .toBe(true);
          const controls = await page.locator("header a, header button").evaluateAll((nodes) =>
            nodes.map((node) => {
              const r = node.getBoundingClientRect();
              return { left: r.left, right: r.right };
            }),
          );
          controls.forEach((r, index) => {
            expect(r.left).toBeGreaterThanOrEqual(0);
            expect(r.right).toBeLessThanOrEqual(width);
            if (index) expect(r.left).toBeGreaterThanOrEqual(controls[index - 1].right);
          });
        });
      }
    }
  });
}
test("Focus word and return control stay above the dock on a short phone", async ({
  page,
  app,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await app.sample();
  await app.mode("Focus");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const word = document.querySelector(".focus-word")!.getBoundingClientRect();
        const back = document.querySelector(".context-button")!.getBoundingClientRect();
        const header = document.querySelector("header")!.getBoundingClientRect();
        const dock = document.querySelector(".reader-dock")!.getBoundingClientRect();
        return word.top >= header.bottom && word.bottom <= dock.top && back.bottom <= dock.top;
      }),
    )
    .toBe(true);
});
test("reduced motion skips word-flight animation while preserving position", async ({
  page,
  app,
}) => {
  await page.clock.install();
  await app.sample();
  await app.seek(4);
  await freezeTime(page);
  await app.button("Focus").click();
  await page.clock.runFor(32);
  await expect(page.getByTestId("word-flight")).toHaveCount(0);
  await app.readerReady();
  await expect(page.getByTestId("focus-word")).toHaveText("bookshop");
  await app.mode("Article", true);
  await expect(app.activeWord).toHaveAttribute("data-word", "4");
});
test("sticky navbar stays visible while reading down the page", async ({ page, app }) => {
  await app.sample();
  await page.evaluate(() => window.scrollTo(0, 700));
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await expect
    .poll(() => page.locator("header").evaluate((node) => node.getBoundingClientRect().top))
    .toBe(0);
  await expect(app.button("Keyboard shortcuts")).toBeInViewport();
});
