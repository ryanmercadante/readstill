import { Readability } from "@mozilla/readability";
import { blockTextSize, validReading } from "./library";
import type { ImportIssue, Reading } from "./library";
import { blockWriter, writeHtmlBlocks } from "./html-blocks";
import { MAX_TEXT_LENGTH } from "./reader";

const PAGE_ORIGINAL = {
  interactive: "open the original page for interactive features.",
  embedded: "This content is on the original page but can't be displayed in Still yet.",
  table: "Open the original page to view it.",
};
const NO_ARTICLE =
  "Still couldn't find an article on this page. If it loads its text with JavaScript or needs a sign-in, copy the text and paste it instead.";

/** Drop a trailing “ | Site name” that pages add to their titles. */
export function articleTitle(title: string, siteName: string): string {
  const name = siteName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!name) return title.trim();
  return title
    .trim()
    .replace(new RegExp(`\\s+[|\\-–—·:]\\s+${name}$`, "i"), "")
    .trim();
}

/** Accept “example.com/post” as well as a full address. */
export function normalizeAddress(input: string): string {
  const value = input.trim();
  return /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
}

/**
 * Turn a fetched page into a reading. Extraction happens here, in the browser:
 * the server only fetches the page, and the article text stays on this device.
 * Images are left out for now; figure captions remain as text.
 */
export async function webReading(html: string, address: string): Promise<Reading> {
  const url = new URL(address);
  const page = new DOMParser().parseFromString(html, "text/html");
  const base = page.createElement("base");
  base.href = url.href;
  page.head.prepend(base);
  const article = new Readability(page).parse();
  if (!article?.content || (article.textContent ?? "").trim().length < 200)
    throw new Error(NO_ARTICLE);
  const body = new DOMParser().parseFromString(article.content, "text/html").body;
  const issues: ImportIssue[] = [];
  const writer = blockWriter("article", issues);
  await writeHtmlBlocks(body, writer, { original: PAGE_ORIGINAL });
  if (!writer.blocks.some((block) => block.type === "text")) throw new Error(NO_ARTICLE);
  if (writer.blocks.reduce((n, b) => n + blockTextSize(b), 0) > MAX_TEXT_LENGTH)
    throw new Error(
      "This article is longer than 100,000 characters. Copy and paste the part you want to read.",
    );
  const host = url.hostname.replace(/^www\./, "");
  const siteName = (article.siteName?.trim() || host).slice(0, 300);
  const title = (articleTitle(article.title ?? "", siteName) || host).slice(0, 300);
  const reading: Reading = {
    id: crypto.randomUUID(),
    title,
    author: (article.byline ?? "").replace(/\s+/g, " ").trim().slice(0, 300),
    kind: "web",
    chapters: [{ id: "article", title, blocks: writer.blocks }],
    addedAt: Date.now(),
    source: { url: url.href, siteName },
    ...(issues.length ? { importIssues: issues } : {}),
  };
  if (!validReading(reading))
    throw new Error("This article exceeds Still's document limits. Paste the part you want.");
  return reading;
}

/** Fetch a page through Still's server and extract its article. */
export async function importWebPage(input: string, fetcher: typeof fetch = fetch) {
  const response = await fetcher("/api/page", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: normalizeAddress(input) }),
  });
  let data: { url?: unknown; html?: unknown; error?: unknown };
  try {
    data = await response.json();
  } catch {
    throw new Error("Still couldn't open this page. Check your connection and try again.");
  }
  if (!response.ok || typeof data.url !== "string" || typeof data.html !== "string")
    throw new Error(
      typeof data.error === "string" ? data.error : "Still couldn't open this page. Try again.",
    );
  return webReading(data.html, data.url);
}
