import { unzip, strFromU8 } from "fflate";
import { MAX_BOOK_TEXT, MAX_FILE_BYTES } from "./library";
import type { Chapter, Illustration, Reading } from "./library";
import { MAX_TEXT_LENGTH } from "./reader";

const MAX_EXPANDED_BYTES = 40_000_000;
const MAX_ENTRY_BYTES = 5_000_000;
const elements = (node: Document | Element, name: string) =>
  Array.from(node.getElementsByTagNameNS("*", name));
const content = (node: Document | Element, name: string) =>
  elements(node, name)[0]?.textContent?.trim() ?? "";

function xml(source: string): Document {
  if (/<!ENTITY/i.test(source)) throw new Error("This EPUB contains unsupported XML entities.");
  const doc = new DOMParser().parseFromString(source, "application/xml");
  if (elements(doc, "parsererror").length)
    throw new Error(
      "This EPUB contains an unreadable document. Try another EPUB or paste its text.",
    );
  return doc;
}

export function epubPath(base: string, reference: string): string {
  if (
    !reference ||
    [...reference].some((char) => char.charCodeAt(0) <= 32 || char === "\\") ||
    /^(?:[a-z][a-z\d+.-]*:|\/)/i.test(reference)
  )
    throw new Error("This EPUB refers to content outside the book.");
  const url = new URL(reference, `https://still.invalid/${base}`);
  if (url.origin !== "https://still.invalid" || url.search)
    throw new Error("This EPUB refers to content outside the book.");
  try {
    return decodeURIComponent(url.pathname.slice(1));
  } catch {
    throw new Error("This EPUB has an invalid content path.");
  }
}

async function unpack(bytes: Uint8Array): Promise<Record<string, Uint8Array>> {
  if (bytes.length > MAX_FILE_BYTES) throw new Error("Choose an EPUB smaller than 25 MB.");
  let expanded = 0;
  let count = 0;
  const names = new Set<string>();
  return new Promise((resolve, reject) => {
    try {
      unzip(
        bytes,
        {
          filter: (file) => {
            count++;
            if (count > 3000 || names.has(file.name))
              throw new Error("This EPUB has too many files or duplicate paths.");
            names.add(file.name);
            // Fonts and style sheets are not rendered. Keep only reading resources.
            if (
              !/\.(?:xml|opf|ncx|xhtml|html|htm|png|jpe?g|gif|webp)$/i.test(file.name) &&
              file.name !== "mimetype"
            )
              return false;
            expanded += file.originalSize;
            if (file.originalSize > MAX_ENTRY_BYTES || expanded > MAX_EXPANDED_BYTES)
              throw new Error("This EPUB expands beyond the reading limit. Try a smaller book.");
            return true;
          },
        },
        (error, files) => {
          if (error)
            reject(new Error("This EPUB couldn't be unpacked. Choose a valid, DRM-free EPUB."));
          else resolve(files);
        },
      );
    } catch (error) {
      reject(error instanceof Error ? error : new Error("This EPUB couldn't be unpacked."));
    }
  });
}

function imageSource(bytes: Uint8Array, type: string): string {
  // Encode in small chunks to avoid call-stack limits on illustrations.
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return `data:${type};base64,${btoa(binary)}`;
}

// Some prose books encode their contents list as two-column navigation tables.
// Accept only chapter-link/label rows; data tables still require a richer reader.
function isContentsTable(table: Element, path: string, chapters: Set<string>): boolean {
  const rows = elements(table, "tr");
  return (
    rows.length > 0 &&
    !elements(table, "th").length &&
    rows.every((row) => {
      const cells = Array.from(row.children);
      if (
        cells.length !== 2 ||
        cells.some(
          (cell) =>
            cell.localName !== "td" || cell.hasAttribute("rowspan") || cell.hasAttribute("colspan"),
        )
      )
        return false;
      const links = elements(cells[0], "a");
      return (
        links.length === 1 &&
        cells[0].textContent?.trim() === links[0].textContent?.trim() &&
        !cells[1].children.length &&
        chapters.has(epubPath(path, links[0].getAttribute("href") ?? ""))
      );
    })
  );
}

function isRasterWrapper(svg: Element): boolean {
  return (
    elements(svg, "image").length === 1 &&
    Array.from(svg.getElementsByTagName("*")).every(
      (element) =>
        ["image", "title", "desc"].includes(element.localName) &&
        !["transform", "clip-path", "mask"].some((attribute) => element.hasAttribute(attribute)),
    )
  );
}

export async function importEpub(bytes: Uint8Array, fallbackTitle: string): Promise<Reading> {
  const files = await unpack(bytes);
  const read = (path: string) => {
    if (!Object.hasOwn(files, path))
      throw new Error(`This EPUB is missing a reading resource: ${path.slice(0, 100)}.`);
    return strFromU8(files[path]);
  };
  if (read("mimetype").trim() !== "application/epub+zip")
    throw new Error("Choose an EPUB file, not a ZIP archive or PDF.");
  const container = xml(read("META-INF/container.xml"));
  const packagePath = elements(container, "rootfile")
    .find((r) => r.getAttribute("media-type") === "application/oebps-package+xml")
    ?.getAttribute("full-path");
  if (!packagePath) throw new Error("This EPUB doesn't identify a book document.");
  const opf = xml(read(epubPath("", packagePath)));
  const metadata = elements(opf, "metadata")[0];
  if (!metadata) throw new Error("This EPUB is missing its book information.");
  if (
    elements(opf, "meta").some(
      (m) =>
        (m.getAttribute("property") === "rendition:layout" &&
          m.textContent?.trim() === "pre-paginated") ||
        (m.getAttribute("name") === "fixed-layout" && m.getAttribute("content") === "true"),
    )
  )
    throw new Error(
      "This book has a fixed layout. Still currently supports reflowable prose EPUBs.",
    );
  const manifest = new Map(
    elements(opf, "item").map((item) => [
      item.getAttribute("id"),
      {
        path: epubPath(packagePath, item.getAttribute("href") ?? ""),
        type: item.getAttribute("media-type"),
        properties: item.getAttribute("properties")?.split(/\s+/) ?? [],
      },
    ]),
  );
  const encrypted = files["META-INF/encryption.xml"]
    ? elements(xml(read("META-INF/encryption.xml")), "CipherReference").map((r) =>
        epubPath("", r.getAttribute("URI") ?? ""),
      )
    : [];
  const readable = (path: string) => {
    if (encrypted.includes(path))
      throw new Error("This book contains encrypted reading content. Choose a DRM-free EPUB.");
    return read(path);
  };
  const labels = new Map<string, string>();
  const nav = [...manifest.values()].find((m) => m.properties.includes("nav"));
  if (nav) {
    const navDoc = xml(readable(nav.path));
    const toc = elements(navDoc, "nav").find((n) =>
      (n.getAttributeNS("http://www.idpf.org/2007/ops", "type") ?? "").split(/\s+/).includes("toc"),
    );
    if (toc)
      for (const anchor of elements(toc, "a")) {
        const path = epubPath(nav.path, anchor.getAttribute("href") ?? "");
        if (!labels.has(path)) labels.set(path, anchor.textContent?.trim() ?? "");
      }
  } else {
    const ncx = [...manifest.values()].find((m) => m.type === "application/x-dtbncx+xml");
    if (ncx)
      for (const point of elements(xml(readable(ncx.path)), "navPoint")) {
        const ref = elements(point, "content")[0]?.getAttribute("src");
        if (ref) {
          const path = epubPath(ncx.path, ref);
          if (!labels.has(path)) labels.set(path, content(point, "navLabel"));
        }
      }
  }
  const chapters: Chapter[] = [];
  const spinePaths = new Set(
    elements(opf, "itemref").map((ref) => manifest.get(ref.getAttribute("idref"))?.path ?? ""),
  );
  const seen = new Set<string>();
  let totalText = 0;
  for (const ref of elements(opf, "itemref")) {
    if (ref.getAttribute("properties")?.split(/\s+/).includes("rendition:layout-pre-paginated"))
      throw new Error("This book contains fixed-layout sections. Choose a reflowable prose EPUB.");
    const item = manifest.get(ref.getAttribute("idref"));
    if (!item) throw new Error("This EPUB has a broken chapter list.");
    if (item.properties.includes("nav")) continue;
    if (item.type !== "application/xhtml+xml")
      throw new Error("This EPUB contains a chapter format Still can't read. Choose a prose EPUB.");
    if (seen.has(item.path)) throw new Error("This EPUB repeats a chapter in its reading order.");
    seen.add(item.path);
    const document = xml(readable(item.path));
    const body = elements(document, "body")[0];
    if (!body) throw new Error("This EPUB contains a chapter without a reading body.");
    if (
      ["math", "audio", "video", "iframe", "object", "canvas"].some(
        (name) => elements(body, name).length,
      ) ||
      elements(body, "table").some((table) => !isContentsTable(table, item.path, spinePaths)) ||
      elements(body, "svg").some((svg) => !isRasterWrapper(svg))
    )
      throw new Error(
        "This book includes tables, formulas, or media Still can't preserve yet. Try a prose EPUB, or paste a passage.",
      );
    for (const tag of ["script", "style", "noscript"])
      for (const node of elements(body, tag)) node.remove();
    const paragraphs: string[] = [];
    const images: Illustration[] = [];
    let buffer = "";
    const flush = () => {
      const text = buffer.replace(/\s+/gu, " ").trim();
      if (text) paragraphs.push(text);
      buffer = "";
    };
    const visit = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        buffer += node.textContent ?? "";
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const element = node as Element;
      const tag = element.localName;
      if (tag === "svg") {
        visit(elements(element, "image")[0]);
        return;
      }
      if (tag === "td") buffer += " ";
      if (tag === "img" || tag === "image") {
        flush();
        const path = epubPath(
          item.path,
          element.getAttribute("src") ??
            element.getAttribute("href") ??
            element.getAttributeNS("http://www.w3.org/1999/xlink", "href") ??
            "",
        );
        const asset = [...manifest.values()].find((m) => m.path === path);
        if (
          !asset?.type ||
          !["image/png", "image/jpeg", "image/gif", "image/webp"].includes(asset.type)
        )
          throw new Error(
            "This book contains an unsupported illustration format. Still supports PNG, JPEG, GIF, and WebP.",
          );
        if (encrypted.includes(path))
          throw new Error("This book contains encrypted illustrations. Choose a DRM-free EPUB.");
        if (!Object.hasOwn(files, path))
          throw new Error("This book is missing an illustration. Try another EPUB.");
        images.push({
          beforeParagraph: paragraphs.length,
          src: imageSource(files[path], asset.type),
          alt: (
            element.getAttribute("alt") ||
            (tag === "image" &&
              (content(element.parentElement!, "title") || content(document, "title"))) ||
            "Book illustration"
          ).slice(0, 1000),
        });
        return;
      }
      const block =
        /^(?:p|div|section|article|aside|blockquote|h[1-6]|li|ul|ol|dl|dt|dd|figure|figcaption|pre|br|hr|table|tr)$/.test(
          tag,
        );
      if (block) flush();
      for (const child of element.childNodes) visit(child);
      if (block) flush();
    };
    visit(body);
    flush();
    if (!paragraphs.length && images.length) paragraphs.push(images.map((i) => i.alt).join(". "));
    if (!paragraphs.length) continue;
    const text = paragraphs.join("\n\n");
    totalText += text.length;
    if (text.length > MAX_TEXT_LENGTH || totalText > MAX_BOOK_TEXT)
      throw new Error(
        "This book is too long for this version: up to 100,000 characters per chapter and 2 million per book.",
      );
    if (chapters.length >= 500 || images.length > 100)
      throw new Error("This book has too many chapters or illustrations for this version.");
    chapters.push({
      id: item.path,
      title: (
        labels.get(item.path) ||
        content(body, "h1") ||
        content(body, "h2") ||
        content(document, "title") ||
        `Chapter ${chapters.length + 1}`
      ).slice(0, 300),
      text,
      images,
    });
  }
  if (!chapters.length)
    throw new Error("No readable chapters were found. Choose a prose EPUB or paste its text.");
  return {
    id: crypto.randomUUID(),
    title: (content(metadata, "title") || fallbackTitle || "Untitled book").slice(0, 300),
    author: content(metadata, "creator").slice(0, 300),
    kind: "epub",
    chapters,
    addedAt: Date.now(),
  };
}
