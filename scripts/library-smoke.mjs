import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { epubFixture, sampleEpubFiles } from "../src/lib/__fixtures__/epub.ts";

const baseUrl = process.argv[2] || "http://127.0.0.1:5173";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const ready = () => page.waitForFunction(() => !document.querySelector(".paste-button")?.disabled);
const saved = () =>
  page.waitForFunction(
    () =>
      document.querySelector('[data-testid="save-status"]')?.textContent === "Saved on this device",
  );
const position = () => page.locator('[aria-current="location"]').getAttribute("data-word");
const library = async () => {
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await page.getByRole("heading", { name: "Your library", exact: true }).waitFor();
};
const audit = async (label) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  assert.deepEqual(
    results.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    [],
    label,
  );
};
const paste = async (text, title) => {
  await page.getByRole("button", { name: "Paste text", exact: true }).click();
  await page.getByLabel("Title (optional)").fill(title);
  await page.getByLabel("Your text", { exact: true }).fill(text);
  await page.getByRole("button", { name: "Start reading", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
};
try {
  await mkdir(".impeccable/review", { recursive: true });
  await page.goto(baseUrl);
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("keyval-store", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("keyval");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("keyval", "readwrite");
        tx.objectStore("keyval").put(
          {
            version: 1,
            title: "An earlier reading",
            text: "These are the words saved before the library arrived.",
            index: 4,
            wpm: 350,
          },
          "still.current-reading.v1",
        );
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
  });
  await page.goto(new URL("/reader", baseUrl).href);
  await ready();
  await page.getByRole("heading", { name: "An earlier reading", exact: true }).waitFor();
  assert.equal(await position(), "4");
  assert.equal(await page.getByRole("slider").inputValue(), "350");
  await paste("A second passage waits here. We can return tomorrow.", "Tomorrow's passage");
  await page.locator('[data-word="3"]').click();
  await saved();
  await library();
  assert.equal(await page.getByRole("list", { name: "Saved readings" }).locator("li").count(), 2);
  await page.getByRole("button", { name: "An earlier reading", exact: true }).click();
  assert.equal(await position(), "4");
  await library();
  await page.getByLabel("Choose EPUB", { exact: true }).setInputFiles({
    name: "afternoon.epub",
    mimeType: "application/epub+zip",
    // Exercise fflate's worker path with a large source document, while the
    // normalized chapter remains short. Publisher style sheets are ignored.
    buffer: Buffer.from(
      epubFixture({
        "OPS/text/first.xhtml": sampleEpubFiles["OPS/text/first.xhtml"].replace(
          "</head>",
          `<style>/*${" ".repeat(400_000)}*/</style></head>`,
        ),
      }),
    ),
  });
  await page
    .getByText("Added A quiet afternoon. Your book is ready to read.", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Continue reading", exact: true }).click();
  assert.equal(await page.getByLabel(/Chapter 1 of 2/).inputValue(), "OPS/text/first.xhtml");
  assert.equal(await page.getByAltText("A small illustration").count(), 1);
  await audit("EPUB chapter desktop");
  await page.getByRole("button", { name: "Next chapter", exact: true }).click();
  await page.locator('[data-word="5"]').click();
  assert.equal(await position(), "5");
  await saved();
  await page.reload();
  await ready();
  assert.equal(await page.getByLabel(/Chapter 2 of 2/).inputValue(), "OPS/text/second.xhtml");
  assert.equal(await position(), "5");
  await page.getByRole("button", { name: "Previous chapter", exact: true }).click();
  await page.locator("[data-word]").last().click();
  await page.getByRole("slider").fill("700");
  await page.getByRole("button", { name: "Read passage", exact: true }).click();
  await page.getByRole("button", { name: "Read again", exact: true }).waitFor();
  await page.getByRole("button", { name: "Next chapter", exact: true }).click();
  assert.equal(await position(), "0");
  assert.equal(await page.getByRole("button", { name: "Read passage", exact: true }).count(), 1);
  await page.locator('[data-word="5"]').click();
  await saved();
  await library();
  await audit("Library desktop");
  await page.screenshot({ path: ".impeccable/review/library-desktop.png", fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Library overflows at ${width}px`,
    );
    await audit(`Library ${width}px`);
    assert.ok(
      (await page.getByRole("heading", { name: "A quiet afternoon", exact: true }).boundingBox())
        .width > 200,
      "Continue-reading title must have room to wrap naturally",
    );
    await page.screenshot({ path: `.impeccable/review/library-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export library", exact: true }).click();
  const download = await downloadPromise;
  const backup = await readFile(await download.path());
  const json = JSON.parse(backup.toString());
  assert.equal(json.library.readings.length, 3);
  const book = json.library.readings.find((r) => r.kind === "epub");
  assert.equal(json.library.positions[book.id].index, 5);
  assert.ok(book.chapters[0].images[0].src.startsWith("data:image/png;base64,"));
  await page.getByRole("button", { name: "Remove Tomorrow's passage", exact: true }).click();
  await page.getByRole("button", { name: "Remove reading", exact: true }).click();
  assert.equal(await page.getByRole("list", { name: "Saved readings" }).locator("li").count(), 2);
  await page
    .getByLabel("Choose Still backup", { exact: true })
    .setInputFiles({ name: "still.json", mimeType: "application/json", buffer: backup });
  await page
    .getByText("Restored 1 reading. Existing readings and progress were kept.", { exact: true })
    .waitFor();
  assert.equal(await page.getByRole("list", { name: "Saved readings" }).locator("li").count(), 3);
  await page.getByLabel("Choose Still backup", { exact: true }).setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"format":"still-library","version":99}'),
  });
  await page.getByRole("alert").waitFor();
  assert.equal(await page.getByRole("list", { name: "Saved readings" }).locator("li").count(), 3);
  await page.getByLabel("Choose EPUB", { exact: true }).setInputFiles({
    name: "bad.epub",
    mimeType: "application/epub+zip",
    buffer: Buffer.from("not an epub"),
  });
  await page
    .getByText("This EPUB couldn't be unpacked. Choose a valid, DRM-free EPUB.", { exact: true })
    .waitFor();
  await audit("Library import error");
  await page.getByRole("button", { name: "Continue reading", exact: true }).click();
  assert.equal(await position(), "5");
  await saved();
  await page.reload();
  await ready();
  await library();
  assert.equal(await page.getByRole("list", { name: "Saved readings" }).locator("li").count(), 3);

  // A failed write must not be advertised as saved; exporting remains available.
  await page.getByRole("button", { name: "Continue reading", exact: true }).click();
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = () => {
      throw new DOMException("Storage full", "QuotaExceededError");
    };
  });
  await page.locator('[data-word="6"]').click();
  await page.getByText(/This browser couldn't save your library/).waitFor();
  await library();
  const unsavedDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export library", exact: true }).click();
  const unsaved = JSON.parse((await readFile(await (await unsavedDownload).path())).toString());
  assert.equal(unsaved.library.positions[book.id].index, 6);
  await page.reload();
  await ready();
  assert.equal(await position(), "5", "A failed write must leave the persisted position intact");
  await library();
  await page.getByRole("button", { name: "Paste text", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.waitForFunction(() => document.activeElement?.matches(".paste-button"));
  assert.deepEqual(errors, []);
  console.log(
    "PASS: legacy migration, multiple readings, EPUB import/images/TOC, per-book and per-chapter resume, chapter completion, backup export/merge, invalid import recovery, persistence failure/export, and desktop/mobile library accessibility.",
  );
} finally {
  await browser.close();
}
