import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { epubFixture } from "../src/lib/__fixtures__/epub.ts";

const baseUrl = process.argv[2] || "http://127.0.0.1:5173";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
const external = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (request) => {
  if (request.url().includes("evil.invalid")) external.push(request.url());
});
const ready = () => page.waitForFunction(() => !document.querySelector(".paste-button")?.disabled);
const saved = () =>
  page.waitForFunction(
    () =>
      document.querySelector('[data-testid="save-status"]')?.textContent === "Saved on this device",
  );
const audit = async (label) => {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  assert.deepEqual(
    result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    [],
    label,
  );
};
const richSource =
  '<html xmlns="http://www.w3.org/1999/xhtml"><body><p>Before the table.</p><table><caption>Reading results</caption><tr><th scope="col" colspan="2">Results</th></tr><tr><th scope="row" rowspan="2">2026</th><td>42</td></tr><tr><td>43</td></tr></table><p>After the table.</p><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" onload="window.evil=true"><title>Red circle</title><style>@import url(https://evil.invalid/style.css);</style><circle cx="40" cy="40" r="30" fill="red"/><foreignObject><img xmlns="http://www.w3.org/1999/xhtml" src="https://evil.invalid/pixel.png"/></foreignObject><script>window.evil=true</script></svg><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>+</mo><mn>1</mn></math><p>Final prose stays available.</p></body></html>';
const original = Buffer.from(epubFixture({ "OPS/text/first.xhtml": richSource }));
try {
  await mkdir(".impeccable/review", { recursive: true });
  await page.goto(new URL("/reader", baseUrl).href);
  await ready();
  await page.getByRole("link", { name: "Library", exact: true }).click();
  await page
    .getByLabel("Choose EPUB", { exact: true })
    .setInputFiles({ name: "rich.epub", mimeType: "application/epub+zip", buffer: original });
  await page.getByRole("region", { name: "EPUB import review" }).waitFor();
  assert.equal(
    await page.getByRole("list", { name: "Saved readings" }).locator("li").count(),
    0,
    "Import review must not mutate the library",
  );
  await audit("Import review desktop");
  await page.setViewportSize({ width: 320, height: 568 });
  await audit("Import review mobile");
  await page.screenshot({ path: ".impeccable/review/rich-import-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Cancel import", exact: true }).click();
  assert.equal(await page.getByRole("list", { name: "Saved readings" }).locator("li").count(), 0);
  await page
    .getByLabel("Choose EPUB", { exact: true })
    .setInputFiles({ name: "rich.epub", mimeType: "application/epub+zip", buffer: original });
  await page.getByRole("button", { name: "Import with notes", exact: true }).click();
  await page.getByRole("button", { name: "Continue reading", exact: true }).click();
  assert.equal(
    await page.getByRole("columnheader", { name: "Results", exact: true }).getAttribute("colspan"),
    "2",
  );
  assert.equal(
    await page.getByRole("rowheader", { name: "2026", exact: true }).getAttribute("rowspan"),
    "2",
  );
  assert.equal(await page.getByRole("cell", { name: "42", exact: true }).count(), 1);
  const illustration = page.getByAltText("Red circle", { exact: true });
  await illustration.scrollIntoViewIfNeeded();
  await page.waitForFunction(() =>
    [...document.images].some(
      (image) => image.alt === "Red circle" && image.complete && image.naturalWidth === 80,
    ),
  );
  const pixel = await illustration.evaluate((image) => {
    const canvas = document.createElement("canvas");
    canvas.width = 80;
    canvas.height = 80;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    return [...ctx.getImageData(40, 40, 1, 1).data];
  });
  assert.deepEqual(
    pixel,
    [255, 0, 0, 255],
    "SVG geometry must survive sanitization and rasterization",
  );
  await audit("Rich article desktop");
  await page.screenshot({ path: ".impeccable/review/rich-article-desktop.png", fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await audit(`Rich article ${width}`);
  }
  await page.screenshot({ path: ".impeccable/review/rich-article-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Guided", exact: true }).click();
  await page.locator('[data-word="0"]').click();
  await page.getByRole("slider").fill("700");
  await page.getByRole("button", { name: "Read passage", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector('[aria-current="location"]')?.textContent === "Reading results",
  );
  assert.equal(await page.locator("#reading").getAttribute("data-view"), "guided");
  assert.ok(await page.getByRole("button", { name: "Read passage", exact: true }).isDisabled());
  await page.getByRole("slider").fill("100");
  await page.getByRole("button", { name: "Continue after table", exact: true }).click();
  await page.getByRole("button", { name: "Pause reading", exact: true }).click();
  assert.equal(await page.locator('[aria-current="location"]').textContent(), "After");
  assert.equal(await page.locator("#reading").getAttribute("data-view"), "guided");
  await page.getByRole("button", { name: "Next chapter", exact: true }).click();
  assert.equal(await page.locator("#reading").getAttribute("data-view"), "guided");
  await page.getByRole("button", { name: "Previous chapter", exact: true }).click();
  await page.getByRole("button", { name: "Article", exact: true }).click();
  await page.locator('[data-word="0"]').click();
  await page.getByRole("slider").fill("700");
  await page.getByRole("button", { name: "Read passage", exact: true }).click();
  await page.getByRole("region", { name: "Reading paused for context" }).waitFor();
  await page.getByRole("button", { name: "View table", exact: true }).waitFor();
  const progress = await page.getByRole("progressbar").getAttribute("aria-valuenow");
  await page.waitForTimeout(450);
  assert.equal(await page.getByRole("progressbar").getAttribute("aria-valuenow"), progress);
  await audit("Table pause");
  await saved();
  await page.reload();
  await ready();
  assert.equal(
    await page.locator('[aria-current="location"]').textContent(),
    "Reading results",
    "A context pause must survive reload",
  );
  await page.getByRole("button", { name: "Focus", exact: true }).click();
  await page.getByRole("button", { name: "View table", exact: true }).click();
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Reading results");
  await page.getByRole("slider").fill("100");
  await page.getByRole("button", { name: "Continue after table", exact: true }).click();
  await page.getByTestId("focus-word").waitFor();
  await page.getByRole("button", { name: "Pause reading", exact: true }).click();
  assert.equal(
    await page.getByTestId("focus-word").textContent(),
    "After",
    "Continue must land at the first word after the table",
  );
  await page.getByRole("slider").fill("700");
  await page.getByRole("button", { name: "Read passage", exact: true }).click();
  await page.getByRole("button", { name: "View illustration", exact: true }).waitFor();
  await page.getByRole("button", { name: "Continue after illustration", exact: true }).click();
  await page.getByRole("heading", { name: "Formula", exact: true }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Pause reading", exact: true }).count(),
    0,
    "Adjacent context blocks must each pause",
  );
  await page.setViewportSize({ width: 320, height: 568 });
  await audit("Unsupported section pause mobile");
  const continueButton = await page
    .getByRole("button", { name: "Continue after section", exact: true })
    .boundingBox();
  const dock = await page.locator(".reader-dock").boundingBox();
  assert.ok(
    continueButton.y + continueButton.height <= dock.y,
    "Continue must be visible above the dock on a short phone viewport",
  );
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: ".impeccable/review/rich-focus-mobile.png", fullPage: true });
  await saved();
  await page.getByRole("link", { name: "Library", exact: true }).click();
  const originalDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download original EPUB: A quiet afternoon", exact: true })
    .click();
  assert.deepEqual(await readFile(await (await originalDownload).path()), original);
  const backupDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export library", exact: true }).click();
  const backup = await readFile(await (await backupDownload).path());
  const data = JSON.parse(backup.toString());
  assert.equal(data.version, 2);
  const book = data.library.readings.find((r) => r.kind === "epub");
  assert.equal(
    book.chapters[0].blocks.find((block) => block.id === data.library.positions[book.id].blockId)
      .type,
    "unsupported",
  );
  assert.equal(data.library.positions[book.id].index, 0);
  assert.deepEqual(Buffer.from(book.originalEpub.data, "base64"), original);
  // Restore into a fresh browser context to verify rich backups independently of the source DB.
  const restoredContext = await browser.newContext({ reducedMotion: "reduce" });
  const restored = await restoredContext.newPage();
  await restored.goto(new URL("/reader", baseUrl).href);
  await restored.getByRole("link", { name: "Library", exact: true }).click();
  await restored.waitForFunction(() => {
    const input = document.querySelector('[aria-label="Choose Still backup"]');
    return input && !input.disabled;
  });
  await restored
    .getByLabel("Choose Still backup", { exact: true })
    .setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: backup });
  await restored.getByRole("button", { name: "A quiet afternoon", exact: true }).click();
  await restored.getByRole("button", { name: "Focus", exact: true }).click();
  await restored.getByRole("heading", { name: "Formula", exact: true }).waitFor();
  assert.equal(await restored.evaluate(() => window.evil), undefined);
  await restoredContext.close();
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  assert.equal(await page.evaluate(() => window.evil), undefined);
  console.log(
    "PASS: import review/cancel, semantic tables, safe SVG rasterization, no external requests or script execution, context stops/resume, adjacent stops, reload, original download, v2 backup restore, and desktop/mobile accessibility.",
  );
} finally {
  await browser.close();
}
