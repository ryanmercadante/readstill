import { test, expect, StillApp } from "./fixtures/test";
import { passage } from "./fixtures/books";
import { seedRecords } from "./fixtures/storage";
import { sampleReading, initialPosition, textReading } from "../src/lib/library";

test("legacy single-reading storage migrates once with its pace and position", async ({
  page,
  app,
}) => {
  await seedRecords(page, "keyval-store", "keyval", {
    "still.current-reading.v1": {
      version: 1,
      title: "An earlier reading",
      text: "These are the words saved before the library arrived.",
      index: 4,
      wpm: 350,
    },
  });
  await page.goto("/reader");
  await app.readerReady();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("An earlier reading");
  await expect(app.activeWord).toHaveAttribute("data-word", "4");
  await expect(page.getByRole("slider")).toHaveValue("350");
  await app.paste(passage, "New reading");
  await app.saved();
  await page.reload();
  await app.readerReady();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("New reading");
  await app.library();
  await expect(app.savedReadings).toHaveCount(2);
});
test("existing sample entries are removed while user readings and positions are retained", async ({
  page,
  app,
}) => {
  const own = textReading(passage, "Keep this", "own");
  await seedRecords(page, "still-library", "records", {
    settings: { activeId: sampleReading.id, wpm: 350, revision: 3, schemaVersion: 2 },
    [`reading:${sampleReading.id}`]: sampleReading,
    [`position:${sampleReading.id}`]: initialPosition(sampleReading),
    "reading:own": own,
    "position:own": { ...initialPosition(own), index: 3 },
  });
  await app.emptyLibrary();
  await expect(app.savedReadings).toHaveCount(1);
  await app.button("Continue reading").click();
  await app.readerReady();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Keep this");
  await expect(app.activeWord).toHaveAttribute("data-word", "3");
  await expect(page.getByRole("slider")).toHaveValue("350");
});
test("pasting adds separate readings, each with its own saved place", async ({ page, app }) => {
  await app.emptyLibrary();
  await app.paste(passage, "First reading");
  await app.seek(4);
  await app.saved();
  await app.library();
  await app.paste(passage, "Second reading");
  await app.seek(7);
  await app.saved();
  await app.library();
  await expect(app.savedReadings).toHaveCount(2);
  await app.button("First reading").click();
  await expect(app.activeWord).toHaveAttribute("data-word", "4");
  await app.library();
  await app.button("Second reading").click();
  await expect(app.activeWord).toHaveAttribute("data-word", "7");
  await app.saved();
  await page.reload();
  await app.readerReady();
  await expect(app.activeWord).toHaveAttribute("data-word", "7");
});
test("removal requires confirmation and removing the last item returns the empty library", async ({
  app,
  page,
}) => {
  await app.emptyLibrary();
  await app.paste(passage);
  await app.saved();
  await app.library();
  await app.button("Remove My reading").click();
  await app.button("Keep reading").click();
  await expect(app.savedReadings).toHaveCount(1);
  await app.button("Remove My reading").click();
  await app.button("Remove reading").click();
  await expect(app.savedReadings).toHaveCount(0);
  await expect(app.button("Export library")).toBeDisabled();
  await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible();
  await page.goto("/reader");
  await expect(page).toHaveURL(/\/library$/);
});
test("backup restore merges missing readings and keeps existing progress", async ({ app }) => {
  await app.emptyLibrary();
  await app.paste(passage, "First");
  await app.seek(4);
  await app.saved();
  await app.library();
  await app.paste(passage, "Second");
  await app.seek(7);
  await app.saved();
  await app.library();
  const { buffer, data } = await app.exportLibrary();
  expect(data.library.readings).toHaveLength(2);
  await app.button("First").click();
  await app.seek(8);
  await app.saved();
  await app.library();
  await app.button("Remove Second").click();
  await app.button("Remove reading").click();
  await app.restore(buffer);
  await expect(
    app.page.getByText("Restored 1 reading. Existing readings and progress were kept.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(app.savedReadings).toHaveCount(2);
  await app.button("First").click();
  await expect(app.activeWord).toHaveAttribute("data-word", "8");
  await app.library();
  await app.button("Second").click();
  await expect(app.activeWord).toHaveAttribute("data-word", "7");
});
test("invalid backup and EPUB imports leave the library intact", async ({ page, app }) => {
  await app.emptyLibrary();
  await app.paste(passage);
  await app.saved();
  await app.library();
  await app.restore(Buffer.from('{"format":"still-library","version":99}'));
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(app.savedReadings).toHaveCount(1);
  await page.getByLabel("Choose EPUB", { exact: true }).setInputFiles({
    name: "bad.epub",
    mimeType: "application/epub+zip",
    buffer: Buffer.from("not an epub"),
  });
  await expect(page.getByRole("alert")).toHaveText(
    "This EPUB couldn't be unpacked. Choose a valid, DRM-free EPUB.",
  );
  await expect(app.savedReadings).toHaveCount(1);
  await app.button("Continue reading").click();
  await app.readerReady();
});
test("a failed save stays exportable without overwriting the persisted position", async ({
  page,
  app,
}) => {
  await app.emptyLibrary();
  await app.paste(passage);
  await app.seek(4);
  await app.saved();
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = () => {
      throw new DOMException("Storage full", "QuotaExceededError");
    };
  });
  await app.seek(7);
  await expect(page.getByText(/This browser couldn't save your library/)).toBeVisible();
  await expect(page.getByTestId("save-status")).toHaveText("Progress could not be saved");
  await app.library();
  const { data } = await app.exportLibrary();
  expect(data.library.positions[data.library.activeId!].index).toBe(7);
  await page.reload();
  await expect(page.getByLabel("Choose Still backup", { exact: true })).toBeEnabled();
  await app.button("Continue reading").click();
  await app.readerReady();
  await expect(app.activeWord).toHaveAttribute("data-word", "4");
});
test("a stale tab reports a conflict instead of overwriting another tab's progress", async ({
  page,
  app,
  context,
}) => {
  await app.emptyLibrary();
  await app.paste(passage);
  await app.saved();
  const second = await context.newPage();
  const other = new StillApp(second);
  await second.goto("/reader");
  await other.readerReady();
  await app.seek(4);
  await app.saved();
  await other.seek(7);
  await expect(second.getByText(/Your library changed in another tab/)).toBeVisible();
  await second.reload();
  await other.readerReady();
  await expect(other.activeWord).toHaveAttribute("data-word", "4");
  await expect(app.activeWord).toHaveAttribute("data-word", "4");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("My reading");
});
test("a failed load cannot overwrite saved readings", async ({ page, app, context }) => {
  await app.emptyLibrary();
  await app.paste(passage, "Original");
  await app.seek(4);
  await app.saved();
  await page.addInitScript(() => {
    IDBObjectStore.prototype.get = () => {
      throw new DOMException("Read blocked", "UnknownError");
    };
  });
  await page.goto("/library");
  await expect(page.getByText(/Your saved library couldn't be opened/)).toBeVisible();
  await app.paste(passage, "Unsaved");
  await app.library();
  const { data } = await app.exportLibrary();
  expect(data.library.readings[0].title).toBe("Unsaved");
  const second = await context.newPage();
  const other = new StillApp(second);
  await second.goto("/reader");
  await other.readerReady();
  await expect(second.getByRole("heading", { level: 1 })).toHaveText("Original");
  await expect(other.activeWord).toHaveAttribute("data-word", "4");
});
