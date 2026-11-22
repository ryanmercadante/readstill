import { test, expect } from "./fixtures/test";

for (const device of ["iPhone", "iPad"] as const) {
  test(device + " can step through installation and reopen the guide", async ({ page, app }) => {
    await page.addInitScript((device) => {
      Object.defineProperty(navigator, "userAgent", {
        value:
          device === "iPhone" ? "Mozilla/5.0 (iPhone)" : "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
      });
      Object.defineProperty(navigator, "maxTouchPoints", { value: 5 });
    }, device);
    await page.setViewportSize({ width: device === "iPhone" ? 320 : 820, height: 844 });
    await app.emptyLibrary();
    const summary = page.getByText("How to install Still", { exact: true });
    await summary.click();
    const guide = page.getByRole("region", { name: device + " installation walkthrough" });
    await expect(guide).toContainText("Step 1 of 3");
    await expect(guide.getByRole("button", { name: "Back" })).toBeDisabled();
    await guide.getByRole("button", { name: "Next" }).click();
    await expect(guide).toContainText("Step 2 of 3");
    await guide.getByRole("button", { name: "Back" }).click();
    await expect(guide).toContainText("Step 1 of 3");
    await guide.getByRole("button", { name: "Next" }).click();
    await guide.getByRole("button", { name: "Next" }).click();
    await expect(guide).toContainText("Step 3 of 3");
    await guide.getByRole("button", { name: "Done" }).click();
    await expect(guide).toBeHidden();
    await expect(summary).toBeFocused();
    await summary.press("Enter");
    await expect(guide).toContainText("Step 1 of 3");
  });
}

test("desktop library keeps the browser install instructions", async ({ page, app }) => {
  await app.emptyLibrary();
  await page.getByText("How to install Still", { exact: true }).click();
  await expect(page.getByText("Mac with Safari:")).toBeVisible();
  await expect(page.getByRole("region", { name: /installation walkthrough/ })).toHaveCount(0);
});
