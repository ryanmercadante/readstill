import { test as base, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import type { Backup } from "../../src/lib/library";

/** Shared user actions only: each test owns its assertions and fresh browser storage. */
export class StillApp {
  constructor(readonly page: Page) {}
  button(name: string) {
    return this.page.getByRole("button", { name, exact: true });
  }
  get activeWord() {
    return this.page.locator('[aria-current="location"]');
  }
  get savedReadings() {
    return this.page.getByRole("list", { name: "Saved readings" }).locator("li");
  }
  async readerReady() {
    await expect(this.button("Article")).toBeEnabled();
  }
  async sample() {
    await this.page.goto("/reader?sample=true");
    await this.readerReady();
  }
  get mobileNavigation() {
    return (this.page.viewportSize()?.width ?? 1440) <= 800;
  }
  async openMenu(advanceClock = false) {
    if (!this.mobileNavigation) return;
    const menu = this.page.getByRole("menu", { name: "Menu", exact: true });
    if (!(await menu.isVisible())) {
      await this.button("Menu").click();
      if (advanceClock) await this.page.clock.runFor(100);
      await expect(menu).toBeVisible();
    }
  }
  async headerAction(name: string, advanceClock = false) {
    await this.openMenu(advanceClock);
    if (this.mobileNavigation) {
      await this.page
        .getByRole("menuitem", { name: name === "Dark mode" ? "Toggle theme" : name, exact: true })
        .click();
    } else {
      await this.button(name).click();
    }
  }
  async library() {
    await this.openMenu();
    await this.page
      .getByRole(this.mobileNavigation ? "menuitem" : "link", { name: "Library", exact: true })
      .click();
    await expect(this.page).toHaveURL(/\/library$/);
    await expect(this.page.getByLabel("Choose Still backup", { exact: true })).toBeEnabled();
  }
  async emptyLibrary() {
    await this.page.goto("/library");
    await expect(this.page.getByLabel("Choose Still backup", { exact: true })).toBeEnabled();
  }
  async paste(text: string, title = "My reading") {
    await this.headerAction("Paste text");
    await this.page.getByLabel("Title (optional)").fill(title);
    await this.page.getByLabel("Your text", { exact: true }).fill(text);
    await this.button("Start reading").click();
    await expect(this.page.getByRole("dialog")).toHaveCount(0);
    await expect(this.page.getByRole("heading", { level: 1 })).toHaveText(title);
    await this.readerReady();
  }
  async mode(name: "Article" | "Guided" | "Focus", advanceClock = false) {
    await this.button(name).click();
    if (advanceClock) await this.page.clock.runFor(1000);
    await expect(this.button(name)).toHaveAttribute("aria-pressed", "true");
    await this.readerReady();
  }
  async seek(index: number) {
    await this.page.locator(`[data-word="${index}"]`).click();
  }
  async saved() {
    await expect(this.page.getByTestId("save-status")).toHaveText("Saved on this device");
  }
  async exportLibrary(): Promise<{ buffer: Buffer; data: Backup }> {
    const download = this.page.waitForEvent("download");
    await this.button("Export library").click();
    const file = await (await download).path();
    expect(file).not.toBeNull();
    const buffer = await readFile(file!);
    return { buffer, data: JSON.parse(buffer.toString()) as Backup };
  }
  async restore(buffer: Buffer) {
    await this.page
      .getByLabel("Choose Still backup", { exact: true })
      .setInputFiles({ name: "still.json", mimeType: "application/json", buffer });
  }
  async reviewEpub(buffer: Buffer) {
    await this.page
      .getByLabel("Choose EPUB", { exact: true })
      .setInputFiles({ name: "book.epub", mimeType: "application/epub+zip", buffer });
    await expect(this.page.getByRole("region", { name: "EPUB import review" })).toBeVisible();
  }
  async addEpub(buffer: Buffer, withNotes = false) {
    await this.emptyLibrary();
    await this.reviewEpub(buffer);
    await this.button(withNotes ? "Import with notes" : "Add to library").click();
    await this.button("Continue reading").click();
    await this.readerReady();
  }
}

type Fixtures = { app: StillApp; audit: () => Promise<void>; pageErrors: void };
export const test = base.extend<Fixtures>({
  app: async ({ page }, use) => {
    await use(new StillApp(page));
  },
  audit: async ({ page }, use) => {
    await use(async () => {
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        result.violations.map(({ id, nodes }) => ({
          id,
          targets: nodes.map((node) => node.target),
        })),
      ).toEqual([]);
    });
  },
  pageErrors: [
    async ({ context }, use, testInfo) => {
      const errors: string[] = [];
      const observe = (page: Page) => page.on("pageerror", (error) => errors.push(error.message));
      context.pages().forEach(observe);
      context.on("page", observe);
      await use();
      if (errors.length)
        await testInfo.attach("uncaught-browser-errors", {
          body: errors.join("\n"),
          contentType: "text/plain",
        });
      expect(errors, "Uncaught browser errors").toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

// Advance browser time rather than sleeping to prove an interrupted reader stays paused.
// Install before navigation; freeze only after hydration and mode changes have settled.
export async function freezeTime(page: Page) {
  await page.clock.pauseAt(new Date(Date.now() + 1000));
}

export async function hidePage(page: Page, hidden: boolean) {
  await page.evaluate((value) => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => value });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}
