import { test, expect } from "./fixtures/test";
import { passage } from "./fixtures/books";

for (const [route, content] of [
  ["/", "A little space."],
  ["/reader?sample=true", "The pleasure of paying attention"],
  ["/library", "Your library"],
]) {
  test(`server renders ${route}`, async ({ request }) => {
    const response = await request.get(route);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(content);
  });
}
test("unknown routes return a real 404", async ({ request }) => {
  expect((await request.get("/missing-page")).status()).toBe(404);
});
test("landing CTA opens the demo with client navigation", async ({ page, app }) => {
  await page.goto("/");
  // The keyboard legend proves hydration without relying on network idleness.
  await app.button("Keyboard shortcuts").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => {
    document.documentElement.dataset.navigationMarker = "same-document";
  });
  await expect(page.getByRole("link", { name: "Try it", exact: true })).toHaveAttribute(
    "href",
    "/reader?sample=true",
  );
  await page.getByRole("link", { name: "Try it", exact: true }).focus();
  await page.keyboard.press("Enter");
  await app.readerReady();
  await expect(page).toHaveURL(/\/reader\?sample=true$/);
  await expect(page).toHaveTitle("Reader — Still");
  await expect(page.locator("html")).toHaveAttribute("data-navigation-marker", "same-document");
});
test("an empty reader opens the library, and the sample never creates a saved reading", async ({
  page,
  app,
}) => {
  await page.goto("/reader");
  await expect(page).toHaveURL(/\/library$/);
  await expect(
    page.getByRole("heading", { name: "Make room for your first reading." }),
  ).toBeVisible();
  await app.sample();
  await expect(page.getByTestId("save-status")).toContainText("not saved");
  await app.seek(4);
  await page.reload();
  await app.readerReady();
  await expect(app.activeWord).toHaveAttribute("data-word", "0");
  await page.getByRole("link", { name: "Still home", exact: true }).click();
  await expect(page.getByRole("link", { name: "Try it", exact: true })).toBeVisible();
  await app.library();
  await expect(app.savedReadings).toHaveCount(0);
  await expect(app.button("Export library")).toBeDisabled();
  const keys = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("still-library");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    try {
      return await new Promise<IDBValidKey[]>((resolve, reject) => {
        const req = db.transaction("records").objectStore("records").getAllKeys();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
  });
  expect(keys).toEqual(["settings"]);
});
test("history and reload preserve a saved reading; trying the demo does not replace it", async ({
  page,
  app,
}) => {
  await app.emptyLibrary();
  await app.paste(passage);
  await app.seek(4);
  await page.getByRole("slider").fill("400");
  await app.saved();
  await app.library();
  await page.reload();
  await expect(page).toHaveTitle("Library — Still");
  await page.goBack();
  await app.readerReady();
  await expect(app.activeWord).toHaveAttribute("data-word", "4");
  await page.goForward();
  await expect(page.getByRole("heading", { name: "Your library", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Still home", exact: true }).click();
  await page.getByRole("link", { name: "Try it", exact: true }).click();
  await app.readerReady();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The pleasure of paying attention",
  );
  await app.library();
  const { data } = await app.exportLibrary();
  expect(data.library.readings.map((reading) => reading.title)).toEqual(["My reading"]);
  await app.button("Continue reading").click();
  await app.readerReady();
  await expect(app.activeWord).toHaveAttribute("data-word", "4");
  await expect(page.getByRole("slider")).toHaveValue("400");
});
