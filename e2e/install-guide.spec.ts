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

test("Safari on Mac keeps the browser install instructions", async ({ page, app }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X) Version/18.0 Safari/605.1.15",
    }),
  );
  await app.emptyLibrary();
  await page.getByText("How to install Still", { exact: true }).click();
  await expect(page.getByText("Mac with Safari:")).toBeVisible();
  await expect(page.getByRole("region", { name: /installation walkthrough/ })).toHaveCount(0);
});

test("Chromium can install from a prompt captured before opening the library", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Library", exact: true }).first()).toBeVisible();
  await page.evaluate(() => {
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt: async () => {
        document.body.dataset.installPrompted = "yes";
      },
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    window.dispatchEvent(event);
  });
  await page.getByRole("link", { name: "Library", exact: true }).first().click();
  await page.getByText("How to install Still", { exact: true }).click();
  const guide = page.getByRole("region", { name: "Browser installation guide" });
  await guide.getByRole("button", { name: "Install Still" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-install-prompted", "yes");
  await expect(guide.getByRole("button")).toHaveCount(0);
  await expect(guide).toContainText("right end of the address bar");
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(page.getByText("How to install Still", { exact: true })).toHaveCount(0);
});

test("Android Chromium points to the browser menu", async ({ page, app }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Linux; Android 15) Chrome/135.0 Mobile Safari/537.36",
    }),
  );
  await app.emptyLibrary();
  await page.getByText("How to install Still", { exact: true }).click();
  await expect(page.getByRole("region", { name: "Browser installation guide" })).toContainText(
    "Add to Home screen",
  );
});
