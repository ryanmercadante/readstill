// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { articleTitle, importWebPage, normalizeAddress, webReading } from "./web-article";
import { validReading } from "./library";
import { chapterText } from "./reader-document";

const prose = (n: number) =>
  Array.from(
    { length: n },
    (_, i) =>
      `<p>Paragraph ${i + 1} walks slowly through an idea, giving the reader enough sentences to settle into the argument before it moves on.</p>`,
  ).join("");

const page = (article: string) => `<!doctype html>
<html><head>
  <title>On slow reading | The Quiet Review</title>
  <meta property="og:site_name" content="The Quiet Review">
  <meta name="author" content="Ada Example">
</head><body>
  <nav><a href="/">Home</a><a href="/about">About</a></nav>
  <article>
    <h1>On slow reading</h1>
    ${article}
  </article>
  <footer>Subscribe to our newsletter. © The Quiet Review</footer>
  <script>window.tracker = true;</script>
</body></html>`;

describe("web article import", () => {
  it("keeps the article's prose and tables and leaves out page chrome and images", async () => {
    const reading = await webReading(
      page(
        `${prose(4)}<figure><img src="/photo.jpg" alt="A reading chair"><figcaption>The chair by the window.</figcaption></figure>${prose(2)}<table><caption>Pace</caption><tr><th>Mode</th><th>Words</th></tr><tr><td>Focus</td><td>300</td></tr></table>${prose(2)}`,
      ),
      "https://www.quiet.example/essays/slow",
    );
    expect(reading).toMatchObject({
      kind: "web",
      title: "On slow reading",
      author: "Ada Example",
      source: { url: "https://www.quiet.example/essays/slow", siteName: "The Quiet Review" },
    });
    expect(validReading(reading)).toBe(true);
    const text = chapterText(reading.chapters[0]);
    expect(text).toContain("Paragraph 1 walks slowly");
    expect(text).toContain("The chair by the window.");
    expect(text).not.toContain("Subscribe");
    expect(text).not.toContain("Home");
    const blocks = reading.chapters[0].blocks;
    expect(blocks.some((b) => b.type === "image")).toBe(false);
    expect(blocks.find((b) => b.type === "table")).toMatchObject({
      caption: "Pace",
      rows: [
        [
          { text: "Mode", header: true },
          { text: "Words", header: true },
        ],
        [
          { text: "Focus", header: false },
          { text: "300", header: false },
        ],
      ],
    });
  });
  it("marks embedded media and notes it", async () => {
    const reading = await webReading(
      page(`${prose(3)}<video src="/clip.mp4"></video>${prose(3)}`),
      "https://quiet.example/a",
    );
    const video = reading.chapters[0].blocks.find((b) => b.type === "unsupported");
    expect(video).toMatchObject({ label: "Video" });
    expect(reading.importIssues).toEqual([
      expect.objectContaining({ chapterId: "article", blockId: video!.id }),
    ]);
  });
  it("explains when a page has no article to read", async () => {
    await expect(
      webReading(
        '<html><body><div id="root"></div><script src="/app.js"></script></body></html>',
        "https://app.example/",
      ),
    ).rejects.toThrow("couldn't find an article");
  });
  it("refuses articles beyond the passage limit", async () => {
    await expect(webReading(page(prose(900)), "https://quiet.example/long")).rejects.toThrow(
      "longer than 100,000 characters",
    );
  });
  it("drops a trailing site name from titles", () => {
    expect(articleTitle("On slow reading | The Quiet Review", "The Quiet Review")).toBe(
      "On slow reading",
    );
    expect(articleTitle("Q&A: pace - and patience — Site (US)", "Site (US)")).toBe(
      "Q&A: pace - and patience",
    );
    expect(articleTitle("The Quiet Review", "The Quiet Review")).toBe("The Quiet Review");
    expect(articleTitle("Reading — notes", "")).toBe("Reading — notes");
  });
  it("adds https:// to bare addresses", () => {
    expect(normalizeAddress(" example.com/post ")).toBe("https://example.com/post");
    expect(normalizeAddress("http://example.com/")).toBe("http://example.com/");
  });
  it("posts the address to Still's server and shows its error messages", async () => {
    const ok = vi.fn(async () =>
      Response.json({ url: "https://quiet.example/a", html: page(prose(4)) }),
    );
    await expect(importWebPage("quiet.example/a", ok)).resolves.toMatchObject({ kind: "web" });
    expect(ok).toHaveBeenCalledWith("/api/page", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://quiet.example/a" }),
    });
    const refused = async () =>
      Response.json({ error: "Still can only open public web pages." }, { status: 400 });
    await expect(importWebPage("http://localhost", refused)).rejects.toThrow("public web pages");
    const broken = async () => new Response("<html>Bad gateway</html>", { status: 502 });
    await expect(importWebPage("quiet.example/a", broken)).rejects.toThrow("couldn't open");
  });
});
