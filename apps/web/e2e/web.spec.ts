import { test, expect } from "./fixtures/test";
import { solidPng } from "./fixtures/png";

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

test("an article link becomes a saved reading with its source and images", async ({
  page,
  app,
  audit,
}) => {
  const requests: unknown[] = [];
  await page.route("**/api/page", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      json: { url: "https://quiet.example/essays/pace", html: article },
    });
  });
  await page.route("**/api/image", (route) =>
    route.fulfill({ contentType: "image/png", body: solidPng(400, 300) }),
  );
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
  await expect(reading.locator("img")).toHaveAttribute("alt", "A chair");
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

test("article images are fetched through Still, resized, and kept in the reading", async ({
  page,
  app,
}) => {
  const photos: Record<string, Buffer> = {
    "https://quiet.example/small.png": solidPng(320, 200),
    "https://quiet.example/wide.png": solidPng(3200, 1000),
    "https://quiet.example/clear.png": solidPng(2400, 600, 128),
    "https://quiet.example/pixel.png": solidPng(1, 1),
  };
  const requested: string[] = [];
  await page.route("**/api/image", async (route) => {
    const { url } = route.request().postDataJSON() as { url: string };
    requested.push(url);
    if (url.endsWith("missing.png")) return route.fulfill({ status: 502, json: { error: "x" } });
    await route.fulfill({ contentType: "image/png", body: photos[url] });
  });
  await page.route("**/api/page", (route) =>
    route.fulfill({
      json: {
        url: "https://quiet.example/essays/pace",
        html: article.replace(
          '<img src="https://quiet.example/chair.jpg" alt="A chair">',
          ["small", "wide", "clear", "pixel", "missing"]
            .map((name) => `<img src="/${name}.png" alt="${name} photo">`)
            .join(""),
        ),
      },
    }),
  );
  await app.emptyLibrary();
  await app.button("From a link").click();
  await page.getByLabel("Article link").fill("https://quiet.example/essays/pace");
  await app.button("Start reading").click();
  await expect(page).toHaveURL(/\/reader$/);
  await app.readerReady();
  expect(requested.sort()).toEqual([
    "https://quiet.example/clear.png",
    "https://quiet.example/missing.png",
    "https://quiet.example/pixel.png",
    "https://quiet.example/small.png",
    "https://quiet.example/wide.png",
  ]);
  const images = page.locator("article img");
  await expect(images).toHaveCount(3);
  const stored = await images.evaluateAll((elements) =>
    (elements as HTMLImageElement[]).map((image) => ({
      alt: image.alt,
      type: /^data:(image\/\w+)/.exec(image.src)?.[1],
      width: image.naturalWidth,
      height: image.naturalHeight,
    })),
  );
  expect(stored).toEqual([
    // Small originals are kept as they are; large ones are scaled to 1600px.
    { alt: "small photo", type: "image/png", width: 320, height: 200 },
    { alt: "wide photo", type: "image/jpeg", width: 1600, height: 500 },
    // Transparency survives as PNG.
    { alt: "clear photo", type: "image/png", width: 1600, height: 400 },
  ]);
  await app.library();
  await app.savedReadings.first().getByText("Import notes (1)").click();
  await expect(app.savedReadings.first()).toContainText("1 image couldn't be imported.");
});
