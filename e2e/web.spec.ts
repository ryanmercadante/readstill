import { test, expect } from "./fixtures/test";

const paragraphs = Array.from(
  { length: 5 },
  (_, i) =>
    `<p>Paragraph ${i + 1} of the essay takes its time, so a reader can follow the thought without hurrying toward the end.</p>`,
).join("");
const article = `<!doctype html><html><head>
  <title>Reading at your own pace | The Quiet Review</title>
  <meta property="og:site_name" content="The Quiet Review">
</head><body>
  <nav><a href="/">Home</a></nav>
  <article><h1>Reading at your own pace</h1>${paragraphs}
    <figure><img src="https://quiet.example/chair.jpg" alt="A chair"><figcaption>A chair by the window.</figcaption></figure>
  </article>
  <footer>Subscribe for more.</footer>
</body></html>`;

test("an article link becomes a saved reading with its source", async ({ page, app, audit }) => {
  const requests: unknown[] = [];
  await page.route("**/api/page", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      json: { url: "https://quiet.example/essays/pace", html: article },
    });
  });
  await app.emptyLibrary();
  await app.button("From a link").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await audit();
  await page.getByLabel("Article link").fill("quiet.example/essays/pace");
  await app.button("Start reading").click();
  await expect(page).toHaveURL(/\/reader$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reading at your own pace");
  await app.readerReady();
  expect(requests).toEqual([{ url: "https://quiet.example/essays/pace" }]);
  const source = page.getByRole("link", { name: /The Quiet Review/ });
  await expect(source).toHaveAttribute("href", "https://quiet.example/essays/pace");
  await expect(source).toHaveAttribute("target", "_blank");
  const reading = page.locator("article");
  await expect(reading).toContainText("Paragraph 5 of the essay");
  await expect(reading).toContainText("A chair by the window.");
  await expect(reading).not.toContainText("Subscribe");
  await expect(reading.locator("img")).toHaveCount(0);
  await app.saved();
  await page.reload();
  await app.readerReady();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reading at your own pace");
  await app.library();
  await expect(app.savedReadings).toHaveCount(1);
  await expect(app.savedReadings.first()).toContainText("The Quiet Review");
});

test("a page that can't be imported explains why and keeps the dialog open", async ({
  page,
  app,
}) => {
  await app.emptyLibrary();
  await app.button("From a link").click();
  // This reaches the real endpoint, which refuses addresses on the local network.
  await page.getByLabel("Article link").fill("http://localhost/admin");
  await app.button("Start reading").click();
  await expect(page.getByRole("alert")).toHaveText("Still can only open public web pages.");
  await page.route("**/api/page", (route) =>
    route.fulfill({ json: { url: "https://app.example/", html: "<div id=root></div>" } }),
  );
  await page.getByLabel("Article link").fill("https://app.example/");
  await app.button("Start reading").click();
  await expect(page.getByRole("alert")).toContainText("couldn't find an article");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/library$/);
});
