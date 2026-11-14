import { unzip, strFromU8 } from "fflate";
import { MAX_BOOK_TEXT, MAX_FILE_BYTES, MAX_CHAPTER_BLOCKS } from "./library";
import { blockTextSize, validReading } from "./library";
import type { Chapter, ContentBlock, ImportIssue, Reading, TableCell } from "./library";
import { toBase64 } from "./reading-download";
import { prepareSvg, rasterizeSvg } from "./epub-svg";
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
              !/\.(?:xml|opf|ncx|xhtml|html|htm|svg|png|jpe?g|gif|webp)$/i.test(file.name) &&
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

export async function importEpub(
  bytes: Uint8Array,
  fallbackTitle: string,
  originalName = `${fallbackTitle}.epub`,
): Promise<Reading> {
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
        fallback: item.getAttribute("fallback"),
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
  const issues: ImportIssue[] = [];
  const seen = new Set<string>();
  let totalText = 0;
  const rasterTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
  for (const asset of manifest.values()) {
    if (
      encrypted.includes(asset.path) &&
      (asset.type === "application/xhtml+xml" || asset.type?.startsWith("image/"))
    )
      throw new Error("This book contains encrypted reading content. Choose a DRM-free EPUB.");
  }
  const rasterFile = (path: string): string => {
    const asset = [...manifest.values()].find((m) => m.path === path);
    if (!asset?.type || !rasterTypes.includes(asset.type) || !Object.hasOwn(files, path))
      throw new Error("The illustration is missing or uses an unsupported image format.");
    return `data:${asset.type};base64,${toBase64(files[path])}`;
  };
  const raster = (base: string, reference: string): string => {
    if (
      reference.length <= 7_000_000 &&
      /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+=*$/.test(reference)
    )
      return reference;
    return rasterFile(epubPath(base, reference));
  };
  type NewBlock = {
    [K in ContentBlock["type"]]: Omit<Extract<ContentBlock, { type: K }>, "id">;
  }[ContentBlock["type"]];
  for (const ref of elements(opf, "itemref")) {
    if (ref.getAttribute("properties")?.split(/\s+/).includes("rendition:layout-pre-paginated"))
      throw new Error("This book contains fixed-layout sections. Choose a reflowable EPUB.");
    let item = manifest.get(ref.getAttribute("idref"));
    if (!item) throw new Error("This EPUB has a broken chapter list.");
    if (item.properties.includes("nav")) continue;
    const originalItem = item;
    const fallbacks = new Set<string>();
    while (
      !["application/xhtml+xml", "image/svg+xml", ...rasterTypes].includes(item.type ?? "") &&
      item.fallback
    ) {
      if (fallbacks.has(item.path)) throw new Error("This EPUB has a circular fallback chain.");
      fallbacks.add(item.path);
      const next = manifest.get(item.fallback);
      if (!next) break;
      item = next;
    }
    if (seen.has(originalItem.path))
      throw new Error("This EPUB repeats a chapter in its reading order.");
    seen.add(originalItem.path);
    const path = item.path;
    const chapterId = originalItem.path;
    const blocks: ContentBlock[] = [];
    const add = (block: NewBlock): ContentBlock => {
      const value = { ...block, id: `b${blocks.length}` } as ContentBlock;
      if (blocks.length >= MAX_CHAPTER_BLOCKS)
        throw new Error("This chapter has too many separate sections for this version.");
      blocks.push(value);
      return value;
    };
    const report = (block: ContentBlock, message: string) =>
      issues.push({ chapterId, blockId: block.id, message: message.slice(0, 1000) });
    const unavailable = (label: string, reason: string) => {
      const block = add({
        type: "unsupported",
        label: label.slice(0, 300),
        reason: reason.slice(0, 1000),
      });
      report(block, `${label}: ${reason}`);
    };
    const addSvg = async (source: string, alt: string, base: string) => {
      try {
        const prepared = prepareSvg(source, (reference) => raster(base, reference));
        const src = await rasterizeSvg(prepared);
        const block = add({ type: "image", src, alt: alt.slice(0, 1000) || "SVG illustration" });
        if (prepared.simplified)
          report(
            block,
            "This SVG illustration was simplified: scripts, external styling, or unsupported effects were removed. The original EPUB is available to download.",
          );
      } catch (error) {
        unavailable(
          "SVG illustration",
          error instanceof Error ? error.message : "This illustration couldn't be displayed.",
        );
      }
    };
    let title =
      labels.get(originalItem.path) || labels.get(path) || `Chapter ${chapters.length + 1}`;
    if (item.type === "image/svg+xml") {
      const source = readable(path);
      const svg = xml(source);
      title = content(svg, "title") || title;
      await addSvg(source, content(svg, "desc") || title, path);
    } else if (item.type && rasterTypes.includes(item.type)) {
      add({
        type: "image",
        src: rasterFile(path),
        alt: title,
      });
    } else if (item.type !== "application/xhtml+xml") {
      unavailable(
        "Unavailable section",
        `Still can't display this section's format (${item.type ?? "unknown"}). Download the original EPUB to read it in another reader.`,
      );
    } else {
      const document = xml(readable(path));
      const body = elements(document, "body")[0];
      if (!body) throw new Error("This EPUB contains a chapter without a reading body.");
      title =
        labels.get(originalItem.path) ||
        labels.get(path) ||
        content(body, "h1") ||
        content(body, "h2") ||
        content(document, "title") ||
        title;
      let buffer = "";
      const flush = () => {
        const text = buffer.replace(/\s+/gu, " ").trim();
        if (text) add({ type: "text", text });
        buffer = "";
      };
      const visit = async (node: Node): Promise<void> => {
        if (node.nodeType === Node.TEXT_NODE) {
          buffer += node.textContent ?? "";
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const element = node as Element;
        const tag = element.localName;
        if (tag === "style") return;
        if (tag === "script") {
          flush();
          unavailable(
            "Interactive content",
            "Scripts are disabled. Any static text remains readable; use the original EPUB for interactive features.",
          );
          return;
        }
        if (["math", "audio", "video", "iframe", "object", "canvas", "embed"].includes(tag)) {
          flush();
          const label =
            ({ math: "Formula", audio: "Audio", video: "Video" } as Record<string, string>)[tag] ??
            "Embedded content";
          unavailable(
            label,
            "This content is preserved in the original EPUB but can't be displayed in Still yet.",
          );
          return;
        }
        if (tag === "table") {
          flush();
          const rows = elements(element, "tr");
          if (
            !rows.length ||
            rows.length > 200 ||
            ["table", "img", "svg", "math", "audio", "video", "object", "iframe"].some(
              (name) => elements(element, name).length,
            )
          ) {
            unavailable(
              "Table",
              "This table contains nested tables or media, or exceeds the supported size. Download the original EPUB to view it.",
            );
            return;
          }
          let cells = 0;
          const result: TableCell[][] = [];
          for (const row of rows) {
            const columns = Array.from(row.children).filter((c) =>
              ["td", "th"].includes(c.localName),
            );
            if (!columns.length || columns.length > 50 || (cells += columns.length) > 5000) {
              unavailable("Table", "This table's layout exceeds the supported size.");
              return;
            }
            const values: TableCell[] = [];
            for (const cell of columns) {
              const rowSpan = Number(cell.getAttribute("rowspan") ?? "1");
              const colSpan = Number(cell.getAttribute("colspan") ?? "1");
              if (![rowSpan, colSpan].every((n) => Number.isInteger(n) && n >= 1 && n <= 100)) {
                unavailable("Table", "This table uses an unsupported cell layout.");
                return;
              }
              const scope = cell.getAttribute("scope");
              const clone = cell.cloneNode(true) as Element;
              for (const child of [...elements(clone, "script"), ...elements(clone, "style")])
                child.remove();
              for (const child of [...elements(clone, "br"), ...elements(clone, "p")])
                child.appendChild(document.createTextNode(" "));
              values.push({
                text: (clone.textContent ?? "").replace(/\s+/gu, " ").trim(),
                header: cell.localName === "th",
                rowSpan,
                colSpan,
                ...(["row", "col", "rowgroup", "colgroup"].includes(scope ?? "")
                  ? { scope: scope as TableCell["scope"] }
                  : {}),
              });
            }
            result.push(values);
          }
          add({ type: "table", caption: content(element, "caption").slice(0, 1000), rows: result });
          return;
        }
        if (tag === "svg") {
          flush();
          await addSvg(
            new XMLSerializer().serializeToString(element),
            content(element, "title") || content(element, "desc") || "SVG illustration",
            path,
          );
          return;
        }
        if (tag === "img") {
          flush();
          const reference = element.getAttribute("src") ?? "";
          const alt = (element.getAttribute("alt") || "Book illustration").slice(0, 1000);
          try {
            const imagePath = epubPath(path, reference);
            const asset = [...manifest.values()].find((m) => m.path === imagePath);
            if (asset?.type === "image/svg+xml") await addSvg(readable(imagePath), alt, imagePath);
            else add({ type: "image", src: raster(path, reference), alt });
          } catch (error) {
            unavailable(
              alt,
              error instanceof Error ? error.message : "This illustration couldn't be displayed.",
            );
          }
          return;
        }
        const block =
          /^(?:p|div|section|article|aside|blockquote|h[1-6]|li|ul|ol|dl|dt|dd|figure|figcaption|pre|br|hr)$/.test(
            tag,
          );
        if (block) flush();
        for (const child of element.childNodes) await visit(child);
        if (block) flush();
      };
      await visit(body);
      flush();
    }
    if (!blocks.length) continue;
    if (item !== originalItem)
      report(blocks[0], "Still is displaying the publisher-provided fallback for this section.");
    const size = blocks.reduce((n, b) => n + blockTextSize(b), 0);
    totalText += size;
    if (size > MAX_TEXT_LENGTH || totalText > MAX_BOOK_TEXT)
      throw new Error(
        "This book is too long for this version: up to 100,000 characters per chapter and 2 million per book.",
      );
    if (
      chapters.length >= 500 ||
      blocks.length > MAX_CHAPTER_BLOCKS ||
      blocks.filter((b) => b.type === "image").length > 100 ||
      issues.length > 2000
    )
      throw new Error(
        "This book has too many chapters, illustrations, or unsupported sections for this version.",
      );
    chapters.push({ id: chapterId, title: title.slice(0, 300), blocks });
  }
  if (!chapters.length)
    throw new Error("No readable chapters were found. Choose a prose EPUB or paste its text.");
  const reading: Reading = {
    id: crypto.randomUUID(),
    title: (content(metadata, "title") || fallbackTitle || "Untitled book").slice(0, 300),
    author: content(metadata, "creator").slice(0, 300),
    kind: "epub",
    chapters,
    addedAt: Date.now(),
    originalEpub: { name: originalName.slice(0, 200), data: toBase64(bytes) },
    importIssues: issues,
  };
  if (!validReading(reading))
    throw new Error(
      "This EPUB exceeds Still's document limits. Try another edition or a shorter passage.",
    );
  return reading;
}
