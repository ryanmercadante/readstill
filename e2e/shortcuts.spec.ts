import { test, expect, freezeTime } from "./fixtures/test";

for (const route of ["/", "/library", "/reader?sample=true"]) {
  test(`the shortcut legend opens from the header and ? on ${route}`, async ({ page, app }) => {
    await page.goto(route);
    const legend = page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true });
    await app.headerAction("Keyboard shortcuts");
    await expect(legend).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(legend).toHaveCount(0);
    await expect(
      app.button((await app.button("Menu").isVisible()) ? "Menu" : "Keyboard shortcuts"),
    ).toBeFocused();
    await page.keyboard.press("?");
    await expect(legend).toBeVisible();
    await page.getByRole("region", { name: "Chapters", exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByText("Move through chapters", { exact: true })).toBeVisible();
    expect(await legend.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(
      app.button((await app.button("Menu").isVisible()) ? "Menu" : "Keyboard shortcuts"),
    ).toBeFocused();
    await expect(page.locator(".reader-dock kbd")).toHaveCount(0);
  });
}
for (const [trigger, title, returnButton] of [
  ["Paste text", "Something worth reading.", "Read passage"],
  ["About this reader", "A little more focus.", "Read passage"],
  ["Keyboard shortcuts", "Keyboard shortcuts", "Keyboard shortcuts"],
]) {
  test(`${trigger} pauses playback, traps focus, blocks reader keys, and returns focus`, async ({
    page,
    app,
  }) => {
    await page.clock.install();
    await app.sample();
    await app.mode("Guided");
    await app.seek(4);
    await freezeTime(page);
    await app.button("Read passage").click();
    await app.headerAction(trigger, true);
    await page.clock.runFor(100);
    const dialog = page.getByRole("dialog", { name: title, exact: true });
    await expect(dialog).toBeVisible();
    await dialog.focus();
    for (const key of ["ArrowLeft", "ArrowRight", "r", "Space"]) await page.keyboard.press(key);
    await page.clock.runFor(2000);
    await expect(app.activeWord).toHaveAttribute("data-word", "4");
    for (const key of [...Array<string>(8).fill("Tab"), ...Array<string>(8).fill("Shift+Tab")]) {
      await page.keyboard.press(key);
      await page.clock.runFor(32);
      await expect
        .poll(() => dialog.evaluate((node) => node.contains(document.activeElement)))
        .toBe(true);
    }
    await page.keyboard.press("Escape");
    await page.clock.runFor(100);
    await expect(dialog).toHaveCount(0);
    await expect(
      app.button(
        returnButton === "Keyboard shortcuts" && (await app.button("Menu").isVisible())
          ? "Menu"
          : returnButton,
      ),
    ).toBeFocused();
    await page.clock.runFor(2000);
    await expect(app.activeWord).toHaveAttribute("data-word", "4");
    await expect(app.button("Read passage")).toBeVisible();
  });
}
test("paste validation is associated with the field, and drafts reset on close", async ({
  page,
  app,
}) => {
  await app.sample();
  await app.headerAction("Paste text");
  await app.button("Start reading").click();
  const text = page.getByLabel("Your text", { exact: true });
  await expect(text).toHaveAttribute("aria-invalid", "true");
  await expect(text).toHaveAttribute("aria-describedby", "paste-limit paste-error");
  await expect(page.getByRole("alert")).toHaveText("Add a few words to start reading.");
  await page.getByLabel("Title (optional)").fill("Discard this");
  await text.fill("Discard this text");
  await app.button("Close paste dialog").click();
  await expect(app.button("Read passage")).toBeFocused();
  await app.headerAction("Paste text");
  await expect(text).toHaveValue("");
  await expect(page.getByLabel("Title (optional)")).toHaveValue("");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(app.button("Use sample instead")).toHaveCount(0);
});
test("typing and another open dialog suppress the question-mark shortcut", async ({
  page,
  app,
}) => {
  await app.sample();
  await app.headerAction("Paste text");
  const text = page.getByLabel("Your text", { exact: true });
  await text.fill("Why");
  await text.press("End");
  await text.press("?");
  await expect(text).toHaveValue("Why?");
  await expect(page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true })).toHaveCount(
    0,
  );
  await app.button("Close paste dialog").focus();
  await page.keyboard.press("?");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(
    page.getByRole("dialog", { name: "Something worth reading.", exact: true }),
  ).toBeVisible();
});
test("mode keys select one mode and pace keys do not seek the passage", async ({ page, app }) => {
  await app.sample();
  await app.button("Article").focus();
  await page.keyboard.press("ArrowRight");
  await expect(app.button("Guided")).toBeFocused();
  await page.keyboard.press("Space");
  await expect(app.button("Guided")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Space");
  await expect(app.button("Guided")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Home");
  await expect(app.button("Article")).toBeFocused();
  await page.keyboard.press("End");
  await expect(app.button("Focus")).toBeFocused();
  await page.keyboard.press("Enter");
  await app.readerReady();
  await expect(app.button("Read passage")).toBeVisible();
  const slider = page.getByRole("slider");
  await expect(slider).toHaveAttribute("aria-labelledby", /pace-label/);
  await slider.focus();
  for (const [key, value] of [
    ["Home", "100"],
    ["ArrowRight", "125"],
    ["ArrowUp", "150"],
    ["ArrowLeft", "125"],
    ["ArrowDown", "100"],
    ["PageUp", "200"],
    ["PageDown", "100"],
    ["Shift+ArrowUp", "200"],
    ["Shift+ArrowDown", "100"],
    ["End", "700"],
  ]) {
    await page.keyboard.press(key);
    await expect(slider).toHaveValue(value);
  }
  await expect(slider).toHaveAttribute("aria-valuetext", "700 words per minute");
  await expect(page.getByTestId("focus-word")).toHaveText("There");
});
test("reader shortcuts step, replay, play, pause, and leave Focus", async ({ page, app }) => {
  await page.clock.install();
  await app.sample();
  await app.mode("Guided");
  await app.seek(4);
  await freezeTime(page);
  await page.getByRole("article").focus();
  await page.keyboard.press("ArrowRight");
  await expect(app.activeWord).toHaveAttribute("data-word", "5");
  await page.keyboard.press("ArrowLeft");
  await expect(app.activeWord).toHaveAttribute("data-word", "4");
  await page.keyboard.press("r");
  await expect(app.activeWord).toHaveAttribute("data-word", "0");
  await page.keyboard.press("Space");
  await expect(app.button("Pause reading")).toBeVisible();
  await page.clock.runFor(500);
  await page.keyboard.press("Space");
  await expect(app.button("Read passage")).toBeVisible();
  await app.mode("Focus", true);
  // Release control focus so the documented page-level shortcut can handle Escape.
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.keyboard.press("Escape");
  await page.clock.runFor(1000);
  await expect(app.button("Article")).toHaveAttribute("aria-pressed", "true");
});
