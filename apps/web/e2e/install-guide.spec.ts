import { readFile } from "node:fs/promises";
import { passage } from "./fixtures/books";
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

test("Mac Safari walks through Add to Dock and exports saved reading progress", async ({
  page,
  app,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X) Version/18.0 Safari/605.1.15",
    }),
  );
  await app.emptyLibrary();
  await page.getByText("How to install Still", { exact: true }).click();
  const guide = page.getByRole("region", { name: "Mac Safari installation walkthrough" });
  await expect(guide).toContainText("Step 1 of 2");
  await expect(guide).toContainText(
    "click Share in the top-right corner of the toolbar, then choose Add to Dock",
  );
  await expect(guide.getByRole("button", { name: "Export library" })).toHaveCount(0);
  await guide.getByRole("button", { name: "Next" }).click();
  await expect(guide).toContainText("Step 2 of 2");
  await expect(guide.getByText("Add", { exact: true })).toBeVisible();
  await guide.getByRole("button", { name: "Done" }).click();
  await expect(guide).toBeHidden();
  await app.paste(passage, "Dock reading");
  await app.seek(4);
  await app.saved();
  await app.library();
  await page.getByText("How to install Still", { exact: true }).click();
  await expect(guide).toContainText("Restore backup");
  const downloading = page.waitForEvent("download");
  await guide.getByRole("button", { name: "Export library" }).click();
  const file = await (await downloading).path();
  const { library } = JSON.parse(await readFile(file!, "utf8"));
  expect(library.readings[0].title).toBe("Dock reading");
  expect(library.positions[library.activeId].index).toBe(4);
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

for (const [platform, agent, instruction] of [
  ["Android", "Android 15; Mobile", "tap Install"],
  ["Windows", "Windows NT 10.0", "pin Still to the taskbar"],
  ["Mac", "Macintosh; Intel Mac OS X", "Share → Add to Dock"],
  ["Linux", "X11; Linux x86_64", "bookmark your library"],
]) {
  test("Firefox on " + platform + " shows its platform instructions", async ({ page, app }) => {
    await page.addInitScript(
      (agent) =>
        Object.defineProperty(navigator, "userAgent", {
          value: "Mozilla/5.0 (" + agent + ") Gecko/20100101 Firefox/153.0",
        }),
      agent,
    );
    await app.emptyLibrary();
    await page.getByText("How to install Still", { exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Firefox on " + platform + " installation guide" }),
    ).toContainText(instruction);
  });
}

test("Firefox on iPhone uses its own Share instructions", async ({ page, app }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 FxiOS/153.0 Mobile Safari/605.1.15",
    }),
  );
  await app.emptyLibrary();
  await page.getByText("How to install Still", { exact: true }).click();
  const guide = page.getByRole("region", { name: "Firefox on iOS installation walkthrough" });
  await expect(guide).toContainText("In Firefox, tap Share");
  await guide.getByRole("button", { name: "Next" }).click();
  await expect(guide).toContainText("Add to Home Screen");
});
