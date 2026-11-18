import { Readability } from "@mozilla/readability";
import { blockTextSize, validReading } from "./library";
import type { ImportIssue, Reading } from "./library";
import { blockWriter, writeHtmlBlocks } from "./html-blocks";
import { MAX_TEXT_LENGTH } from "./reader";
import { browserImageLoader, imageAddress, MAX_ARTICLE_IMAGES, SkippedImage } from "./web-images";
import type { ImageLoader } from "./web-images";

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

type ImageResult = { src: string } | { skipped: true } | { failed: true };

/** Run `task` over `items` with at most `limit` in flight, keeping results in order. */
function pooled<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R>[] {
  let active = 0;
  const waiting: (() => void)[] = [];
  return items.map(async (item) => {
    if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    active++;
    try {
      return await task(item);
    } finally {
      active--;
      waiting.shift()?.();
    }
  });
}

export type WebReadingOptions = {
  /** Fetch and prepare images. Without a loader, images are left out. */
  loadImage?: ImageLoader;
  onProgress?: (message: string) => void;
};

/**
 * Turn a fetched page into a reading. Extraction happens here, in the browser:
 * the server only fetches the page and its images, and the article stays on this
 * device. Up to 30 images are kept; icons and tracking pixels are skipped.
 */
export async function webReading(
  html: string,
  address: string,
  { loadImage, onProgress }: WebReadingOptions = {},
): Promise<Reading> {
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
  // Start downloads up front so they run in parallel; blocks are still written in order.
  const candidates = loadImage
    ? Array.from(body.getElementsByTagName("img"))
        .map((element) => ({ element, address: imageAddress(element, url) }))
        .filter((image): image is { element: HTMLImageElement; address: string } => !!image.address)
    : [];
  const images = new Map<Element, Promise<ImageResult> | null>(
    candidates.map(({ element }) => [element, null]),
  );
  // Fetch a few more than are kept, so skipped icons don't cost real images.
  const fetching = candidates.slice(0, MAX_ARTICLE_IMAGES + 10);
  if (loadImage && fetching.length) {
    let done = 0;
    const progress = () => onProgress?.(`Adding images (${done} of ${fetching.length})…`);
    progress();
    pooled(fetching, 4, async ({ address }): Promise<ImageResult> => {
      try {
        return { src: await loadImage(address) };
      } catch (error) {
        return error instanceof SkippedImage ? { skipped: true } : { failed: true };
      } finally {
        done++;
        progress();
      }
    }).forEach((result, i) => images.set(fetching[i].element, result));
  }
  let added = 0;
  let failed = 0;
  let overflow = false;
  await writeHtmlBlocks(body, writer, {
    original: PAGE_ORIGINAL,
    img: async (element) => {
      if (!images.has(element)) return;
      const pending = images.get(element);
      if (!pending || added >= MAX_ARTICLE_IMAGES) {
        overflow = true;
        return;
      }
      const result = await pending;
      if ("src" in result) {
        added++;
        writer.add({
          type: "image",
          src: result.src,
          alt: (element.getAttribute("alt")?.trim() || "Illustration").slice(0, 1000),
        });
      } else if ("failed" in result) failed++;
    },
  });
  if (!writer.blocks.some((block) => block.type === "text")) throw new Error(NO_ARTICLE);
  if (failed)
    writer.report(
      writer.blocks[0],
      `${failed} ${failed === 1 ? "image" : "images"} couldn't be imported. Open the original page to see ${failed === 1 ? "it" : "them"}.`,
    );
  if (overflow)
    writer.report(
      writer.blocks[0],
      `Still kept the first ${added} images. Open the original page to see the rest.`,
    );
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

/** Fetch a page and its images through Still's server and extract its article. */
export async function importWebPage(
  input: string,
  fetcher: typeof fetch = fetch,
  onProgress?: (message: string) => void,
) {
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
  return webReading(data.html, data.url, {
    loadImage: browserImageLoader(fetcher),
    onProgress,
  });
}
