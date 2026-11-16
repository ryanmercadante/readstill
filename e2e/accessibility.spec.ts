import { test, expect } from "./fixtures/test";
import { richBook, passage } from "./fixtures/books";

for (const theme of ["light", "dark"] as const) {
  test.describe(theme, () => {
    test.beforeEach(async ({ context, baseURL }) => {
      await context.addCookies([{ name: "still-theme", value: theme, url: baseURL! }]);
    });
    test("landing and empty library meet automated WCAG checks", async ({ page, app, audit }) => {
      await page.goto("/");
      await expect(page.getByRole("link", { name: "Try it", exact: true })).toBeVisible();
      await audit();
      await page.goto("/about");
      await expect(page.getByRole("heading", { level: 1, name: "About Still" })).toBeVisible();
      await audit();
      await app.library();
      await expect(
        page.getByRole("heading", { name: "Make room for your first reading." }),
      ).toBeVisible();
      await audit();
    });
    for (const mode of ["Article", "Guided", "Focus"] as const) {
      test(`${mode} meets automated WCAG checks`, async ({ app, audit }) => {
        await app.sample();
        await app.mode(mode);
        await audit();
      });
    }
    for (const name of ["Paste text", "Keyboard shortcuts"]) {
      test(`${name} dialog meets automated WCAG checks`, async ({ page, app, audit }) => {
        await app.sample();
        await app.headerAction(name);
        await expect(page.getByRole("dialog")).toBeVisible();
        await audit();
        if (name === "Paste text") {
          await app.button("Start reading").click();
          await expect(page.getByRole("alert")).toBeVisible();
          await audit();
        }
      });
    }
    test("populated library and invalid-import feedback meet automated WCAG checks", async ({
      page,
      app,
      audit,
    }) => {
      await app.emptyLibrary();
      await app.paste(passage);
      await app.saved();
      await app.library();
      await audit();
      await app.restore(Buffer.from("invalid backup"));
      await expect(page.getByRole("alert")).toBeVisible();
      await audit();
      const title = await page
        .getByRole("heading", { name: "My reading", exact: true })
        .boundingBox();
      expect(title!.width).toBeGreaterThan(200);
    });
    test("rich import, article, and context stop meet automated WCAG checks", async ({
      page,
      app,
      audit,
    }) => {
      await app.emptyLibrary();
      await app.reviewEpub(richBook);
      await audit();
      await app.button("Import with notes").click();
      await app.button("Continue reading").click();
      await app.readerReady();
      await audit();
      await app.mode("Focus");
      await page.getByRole("slider").fill("700");
      await app.button("Read passage").click();
      await expect(app.button("View table")).toBeVisible();
      await audit();
      await app.button("Continue after table").click();
      await expect(app.button("View illustration")).toBeVisible();
      await app.button("Continue after illustration").click();
      await expect(page.getByRole("heading", { name: "Formula", exact: true })).toBeVisible();
      await audit();
      const action = await app.button("Continue after section").boundingBox();
      const dock = await page.locator(".reader-dock").boundingBox();
      expect(action!.y + action!.height).toBeLessThanOrEqual(dock!.y);
    });
  });
}
