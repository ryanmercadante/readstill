import { test, expect, freezeTime } from "./fixtures/test";

for (const theme of ["light", "dark"]) {
  test(`${theme}: compact mobile menu has labeled touch targets, keyboard navigation, and closes on selection`, async ({
    page,
    app,
    audit,
    context,
    baseURL,
  }, testInfo) => {
    await context.addCookies([{ name: "still-theme", value: theme, url: baseURL! }]);
    await page.setViewportSize({ width: 320, height: 568 });
    await app.sample();
    await app.openMenu();
    const menu = page.getByRole("menu", { name: "Menu", exact: true });
    await expect(menu).toBeVisible();
    await audit();
    for (const name of [
      "Library",
      "Paste text",
      "About this reader",
      "Keyboard shortcuts",
      "Toggle theme",
    ]) {
      const item = menu.getByRole("menuitem", {
        name,
        exact: true,
      });
      await expect(item).toBeVisible();
      const box = await item.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    const themeItem = menu.getByRole("menuitem", { name: "Toggle theme", exact: true });
    await expect(themeItem.locator("svg")).toHaveClass(
      theme === "dark" ? /lucide-sun/ : /lucide-moon/,
    );
    const box = await menu.boundingBox();
    expect(box!.width).toBeLessThan(280);
    expect(box!.height).toBeLessThan(320);
    expect(box!.y).toBeGreaterThan(40);
    expect(await menu.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("mobile-menu.png") });
    await page.keyboard.press("Home");
    await expect(menu.getByRole("menuitem", { name: "Library", exact: true })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(menu.getByRole("menuitem", { name: "Paste text", exact: true })).toBeFocused();
    await page.keyboard.press("?");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(app.button("Menu")).toBeFocused();
    await app.openMenu();
    await menu.getByRole("menuitem", { name: "Library", exact: true }).click();
    await expect(page).toHaveURL(/\/library$/);
    await expect(menu).toHaveCount(0);
    await app.headerAction("Paste text");
    await expect(
      page.getByRole("dialog", { name: "Something worth reading.", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(app.button("Menu")).toBeFocused();
    await app.headerAction("Toggle theme");
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      theme === "light" ? "dark" : "light",
    );
    await expect(menu).toBeVisible();
    await expect(themeItem.locator("svg")).toHaveClass(
      theme === "light" ? /lucide-sun/ : /lucide-moon/,
    );
    await expect(themeItem).toHaveText("Toggle theme");
    await themeItem.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(menu).toBeVisible();
    await expect(themeItem.locator("svg")).toHaveClass(
      theme === "dark" ? /lucide-sun/ : /lucide-moon/,
    );
    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(menu).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Library", exact: true })).toBeFocused();
    await expect(app.button("Paste text")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("desktop-header.png") });
  });
}

test("opening and dismissing the menu keeps playback paused at the same word", async ({
  page,
  app,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install();
  await app.sample();
  await app.mode("Guided");
  await app.seek(4);
  await freezeTime(page);
  await app.button("Read passage").click();
  await app.openMenu(true);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await page.clock.runFor(2000);
  await page.keyboard.press("Escape");
  await page.clock.runFor(2000);
  await expect(app.activeWord).toHaveAttribute("data-word", "4");
  await expect(app.button("Read passage")).toBeVisible();
});

test("menu dismisses with an outside tap", async ({ page, app }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await app.sample();
  await app.openMenu();
  await page.mouse.click(12, 400);
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(app.button("Menu")).toBeFocused();
});
