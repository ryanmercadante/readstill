import { toBase64 } from "./reading-download";

export const MAX_ARTICLE_IMAGES = 30;
const MAX_EDGE = 1600;
const MIN_EDGE = 48;
/** Smaller originals are kept byte for byte; larger ones are re-encoded. */
const KEEP_ORIGINAL_BYTES = 600_000;
const MAX_DATA_URL = 7_000_000;
const STORED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

/** Loads one image address and returns a data URL the library can store. */
export type ImageLoader = (address: string) => Promise<string>;

/** An image that isn't worth keeping, such as an icon or tracking pixel. */
export class SkippedImage extends Error {}

/**
 * The best address for an <img>: the srcset candidate closest to 1600px wide,
 * then common lazy-loading attributes, then src. Only http(s) and inline raster
 * data are accepted.
 */
export function imageAddress(element: Element, base: URL): string | null {
  const width = Number(element.getAttribute("width"));
  const height = Number(element.getAttribute("height"));
  if ((width && width < MIN_EDGE) || (height && height < MIN_EDGE)) return null;
  const candidates: string[] = [];
  const srcset = element.getAttribute("srcset") ?? element.getAttribute("data-srcset");
  if (srcset) {
    const sources = srcset
      .split(/,\s+/)
      .map((entry) => {
        const [address, descriptor = ""] = entry.trim().split(/\s+/);
        const size = /^(\d+)w$/.exec(descriptor)?.[1];
        return { address, width: size ? Number(size) : 0 };
      })
      .filter((source) => source.address);
    const fitting = sources.filter((s) => s.width && s.width <= MAX_EDGE);
    const best = fitting.length
      ? fitting.reduce((a, b) => (b.width > a.width ? b : a))
      : sources.reduce((a, b) => (b.width && (!a.width || b.width < a.width) ? b : a));
    if (best) candidates.push(best.address);
  }
  for (const name of ["data-src", "data-lazy-src", "data-original", "src"])
    candidates.push(element.getAttribute(name) ?? "");
  for (const candidate of candidates) {
    if (!candidate.trim()) continue;
    if (/^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(candidate)) {
      // Lazy-loading placeholders are tiny inline images; keep looking for the real one.
      if (candidate.length > 2000) return candidate;
      continue;
    }
    try {
      const url = new URL(candidate, base);
      if (["http:", "https:"].includes(url.protocol)) return url.href;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

function decode(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  const image = new Image();
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), 10_000);
    image.onload = () => {
      clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      clearTimeout(timer);
      reject(new Error("decode"));
    };
    image.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}

/**
 * Fetch an article image through Still's server and prepare it for the library:
 * icons are skipped, and anything over 1600px or 600 KB is scaled down and
 * re-encoded as JPEG, or PNG when it has transparency.
 */
export function browserImageLoader(fetcher: typeof fetch = fetch): ImageLoader {
  return async (address) => {
    const response = address.startsWith("data:")
      ? await fetcher(address)
      : await fetcher("/api/image", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: address }),
        });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const blob = await response.blob();
    const image = await decode(blob);
    const { naturalWidth: width, naturalHeight: height } = image;
    if (width < MIN_EDGE || height < MIN_EDGE) throw new SkippedImage();
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    if (scale === 1 && STORED_TYPES.includes(blob.type) && blob.size <= KEEP_ORIGINAL_BYTES)
      return `data:${blob.type};base64,${toBase64(new Uint8Array(await blob.arrayBuffer()))}`;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let transparent = false;
    if (blob.type !== "image/jpeg") {
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 3; i < data.length; i += 4)
        if (data[i] < 255) {
          transparent = true;
          break;
        }
    }
    const src = transparent ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.85);
    if (src.length > MAX_DATA_URL) throw new Error("too large");
    return src;
  };
}
