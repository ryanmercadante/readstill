import { readFile } from "node:fs/promises";
import { test, expect, StillApp } from "./fixtures/test";
import { standardBook, workerBook, richBook } from "./fixtures/books";

for (const [name, buffer] of [
  ["standard", standardBook],
  ["worker extraction", workerBook],
] as const) {
  test(`${name}: EPUB follows spine order and saves the chapter and word`, async ({
    page,
    app,
  }) => {
    await app.addEpub(buffer);
    await expect(page.getByLabel(/Chapter 1 of 2/)).toHaveValue("OPS/text/first.xhtml");
    await expect(page.getByAltText("A small illustration")).toBeVisible();
    await app.button("Next chapter").click();
    await app.seek(5);
    await app.saved();
    await page.reload();
    await app.readerReady();
    await expect(page.getByLabel(/Chapter 2 of 2/)).toHaveValue("OPS/text/second.xhtml");
    await expect(app.activeWord).toHaveAttribute("data-word", "5");
    await app.button("Previous chapter").click();
    await page.locator("[data-word]").last().click();
    await page.getByRole("slider").fill("700");
    await app.button("Read passage").click();
    await expect(app.button("Read again")).toBeVisible();
    await app.button("Next chapter").click();
    await expect(app.activeWord).toHaveAttribute("data-word", "0");
    await expect(app.button("Read passage")).toBeVisible();
  });
}
test("rich import review can be canceled without adding a reading", async ({ app }) => {
  await app.emptyLibrary();
  await app.reviewEpub(richBook);
  await expect(app.savedReadings).toHaveCount(0);
  await expect(app.page.getByRole("region", { name: "EPUB import review" })).toContainText(
    "1 table",
  );
  await app.button("Cancel import").click();
  await expect(app.page.getByRole("region", { name: "EPUB import review" })).toHaveCount(0);
  await expect(app.savedReadings).toHaveCount(0);
});
test("rich tables remain semantic and SVG renders without executing scripts or fetching external resources", async ({
  page,
  app,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("evil.invalid")) external.push(request.url());
  });
  await app.addEpub(richBook, true);
  await expect(page.getByRole("columnheader", { name: "Results", exact: true })).toHaveAttribute(
    "colspan",
    "2",
  );
  await expect(page.getByRole("rowheader", { name: "2026", exact: true })).toHaveAttribute(
    "rowspan",
    "2",
  );
  await expect(page.getByRole("cell", { name: "42", exact: true })).toBeVisible();
  const picture = page.getByAltText("Red circle", { exact: true });
  await picture.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      picture.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 80),
    )
    .toBe(true);
  const pixel = await picture.evaluate((image: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = 80;
    canvas.height = 80;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    return [...ctx.getImageData(40, 40, 1, 1).data];
  });
  expect(pixel).toEqual([255, 0, 0, 255]);
  expect(external).toEqual([]);
  expect(await page.evaluate(() => Reflect.get(window, "evil"))).toBeUndefined();
});
for (const mode of ["Focus", "Guided"] as const) {
  test(`${mode}: pauses at tables and resumes at the first following word`, async ({
    page,
    app,
  }) => {
    await app.addEpub(richBook, true);
    await app.mode(mode);
    await page.getByRole("slider").fill("700");
    await app.button("Read passage").click();
    if (mode === "Focus") await expect(app.button("View table")).toBeVisible();
    else {
      await expect(app.activeWord).toHaveText("Reading results");
      await expect(app.button("Read passage")).toBeDisabled();
    }
    await app.saved();
    await page.reload();
    await app.readerReady();
    await expect(app.activeWord).toHaveText("Reading results");
    await app.mode(mode);
    if (mode === "Focus") {
      await app.button("View table").click();
      await expect(app.activeWord).toBeFocused();
    }
    await page.getByRole("slider").fill("100");
    await app.button("Continue after table").click();
    await app.button("Pause reading").click();
    await expect(mode === "Guided" ? app.activeWord : page.getByTestId("focus-word")).toHaveText(
      "After",
    );
    await expect(app.button(mode)).toHaveAttribute("aria-pressed", "true");
    if (mode === "Guided") {
      await app.button("Next chapter").click();
      await expect(app.button("Guided")).toHaveAttribute("aria-pressed", "true");
      await expect(app.activeWord).toHaveAttribute("data-word", "0");
    }
  });
}
test("adjacent context blocks each pause, and rich backups retain originals and context positions", async ({
  page,
  app,
  context,
}) => {
  await app.addEpub(richBook, true);
  await app.mode("Focus");
  await page.getByRole("slider").fill("700");
  await app.button("Read passage").click();
  await expect(app.button("View table")).toBeVisible();
  await app.button("Continue after table").click();
  await expect(app.button("View illustration")).toBeVisible();
  await app.button("Continue after illustration").click();
  await expect(page.getByRole("heading", { name: "Formula", exact: true })).toBeVisible();
  await expect(app.button("Pause reading")).toHaveCount(0);
  await app.saved();
  await app.library();
  const download = page.waitForEvent("download");
  await app.button("Download original EPUB: A quiet afternoon").click();
  expect(await readFile((await (await download).path())!)).toEqual(richBook);
  const { buffer, data } = await app.exportLibrary();
  const book = data.library.readings[0];
  const position = data.library.positions[book.id];
  expect(book.chapters[0].blocks.find((block) => block.id === position.blockId)?.type).toBe(
    "unsupported",
  );
  expect(Buffer.from(book.originalEpub!.data, "base64")).toEqual(richBook);
  // A separate isolated context proves this is restored from the file, not from shared IndexedDB.
  const isolated = await context
    .browser()!
    .newContext({ baseURL: new URL(page.url()).origin, reducedMotion: "reduce" });
  try {
    const restoredPage = await isolated.newPage();
    const restored = new StillApp(restoredPage);
    await restored.emptyLibrary();
    await restored.restore(buffer);
    await restored.button("A quiet afternoon").click();
    await restored.readerReady();
    await restored.mode("Focus");
    await expect(restoredPage.getByRole("heading", { name: "Formula", exact: true })).toBeVisible();
  } finally {
    await isolated.close();
  }
});
