import { siteUrl } from "../lib/site";

export const MAX_PAGE_BYTES = 5_000_000;
export const MAX_IMAGE_BYTES = 8_000_000;
const IMAGE_TYPES = /^image\/(?:png|jpeg|gif|webp|avif)\s*(?:;|$)/i;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 10_000;

/** A failure the reader can act on. `status` is what the endpoint answers with. */
export class PageFetchError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Accept only public web addresses: http(s), default port, no credentials, a
 * dotted host name and no IP literals. This keeps the endpoint from being used to
 * reach the Worker's own network or anything that isn't an ordinary web page.
 */
export function publicPageUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new PageFetchError("Enter a full web address, starting with https://.", 400);
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port ||
    raw.length > 2048
  )
    throw new PageFetchError("Enter an ordinary web page address, starting with https://.", 400);
  if (
    !host.includes(".") ||
    host.startsWith("[") ||
    /^[\d.]+$/.test(host) ||
    /(?:^|\.)(?:localhost|local|internal|home\.arpa|lan)$/.test(host)
  )
    throw new PageFetchError("Still can only open public web pages.", 400);
  url.hash = "";
  return url;
}

function charset(contentType: string, head: Uint8Array): string {
  const declared = /charset=["']?([\w-]+)/i.exec(contentType)?.[1];
  if (declared) return declared;
  const prefix = new TextDecoder("latin1").decode(head.subarray(0, 2048));
  return /<meta[^>]+charset=["']?([\w-]+)/i.exec(prefix)?.[1] ?? "utf-8";
}

async function readCapped(
  response: Response,
  maxBytes: number,
  tooLarge: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const length = Number(response.headers.get("content-length"));
  if (length > maxBytes) throw new PageFetchError(tooLarge, 413);
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new PageFetchError(tooLarge, 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

type FetchOptions = {
  accept: string;
  /** Content types to accept, checked against the response's content-type. */
  types: RegExp;
  wrongType: string;
  maxBytes: number;
  tooLarge: string;
};

/**
 * Fetch a public address. Redirects are followed by hand so each hop is checked
 * like the original address. Nothing is stored or logged.
 */
async function fetchPublic(
  raw: string,
  options: FetchOptions,
  fetcher: typeof fetch,
): Promise<{ url: URL; type: string; bytes: Uint8Array<ArrayBuffer> }> {
  let url = publicPageUrl(raw);
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  try {
    for (let hop = 0; ; hop++) {
      const response = await fetcher(url, {
        redirect: "manual",
        signal,
        headers: {
          accept: options.accept,
          "user-agent": `Mozilla/5.0 (compatible; StillReader/1.0; +${siteUrl}/about)`,
        },
      });
      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel();
        const location = response.headers.get("location");
        if (!location || hop >= MAX_REDIRECTS)
          throw new PageFetchError("This page redirects too many times.", 502);
        url = publicPageUrl(new URL(location, url).href);
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new PageFetchError(
          [401, 402, 403].includes(response.status)
            ? "This page needs a sign-in or subscription, so Still can't open it."
            : response.status === 404 || response.status === 410
              ? "This page wasn't found. Check the address and try again."
              : `The site answered with an error (${response.status}). Try again later.`,
          502,
        );
      }
      const type = response.headers.get("content-type") ?? "";
      if (!options.types.test(type)) {
        await response.body?.cancel();
        throw new PageFetchError(options.wrongType, 415);
      }
      return { url, type, bytes: await readCapped(response, options.maxBytes, options.tooLarge) };
    }
  } catch (error) {
    if (error instanceof PageFetchError) throw error;
    if (signal.aborted)
      throw new PageFetchError("The site took too long to respond. Try again later.", 504);
    throw new PageFetchError("Still couldn't reach this site. Check the address.", 502);
  }
}

/** Fetch a public web page's HTML for import. */
export async function fetchPage(
  raw: string,
  fetcher: typeof fetch = fetch,
): Promise<{ url: string; html: string }> {
  const { url, type, bytes } = await fetchPublic(
    raw,
    {
      accept: "text/html,application/xhtml+xml;q=0.9",
      types: /^(?:text\/html|application\/xhtml\+xml)\b/i,
      wrongType: "This link isn't a web page. Still can import articles, not files or feeds.",
      maxBytes: MAX_PAGE_BYTES,
      tooLarge: "This page is too large to import.",
    },
    fetcher,
  );
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(charset(type, bytes));
  } catch {
    decoder = new TextDecoder();
  }
  return { url: url.href, html: decoder.decode(bytes) };
}

/** Fetch one of an article's images. SVG is refused: it can carry scripts. */
export async function fetchImage(
  raw: string,
  fetcher: typeof fetch = fetch,
): Promise<{ type: string; bytes: Uint8Array<ArrayBuffer> }> {
  const { type, bytes } = await fetchPublic(
    raw,
    {
      accept: "image/avif,image/webp,image/png,image/jpeg,image/gif;q=0.9",
      types: IMAGE_TYPES,
      wrongType: "This image uses a format Still can't import.",
      maxBytes: MAX_IMAGE_BYTES,
      tooLarge: "This image is too large to import.",
    },
    fetcher,
  );
  return { type: type.split(";")[0].trim().toLowerCase(), bytes };
}
