import { MAX_CHAPTER_BLOCKS } from "./library";
import type { ContentBlock, TableCell, ImportIssue } from "@still/reader-core";

export const elements = (node: Document | Element, name: string) =>
  Array.from(node.getElementsByTagNameNS("*", name));
export const content = (node: Document | Element, name: string) =>
  elements(node, name)[0]?.textContent?.trim() ?? "";

export type NewBlock = {
  [K in ContentBlock["type"]]: Omit<Extract<ContentBlock, { type: K }>, "id">;
}[ContentBlock["type"]];

/** Collects one chapter's blocks and the import notes that point at them. */
export type BlockWriter = {
  blocks: ContentBlock[];
  add(block: NewBlock): ContentBlock;
  report(block: ContentBlock, message: string): void;
  unavailable(label: string, reason: string): void;
};

export function blockWriter(chapterId: string, issues: ImportIssue[]): BlockWriter {
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
  return {
    blocks,
    add,
    report,
    unavailable: (label, reason) => {
      const block = add({
        type: "unsupported",
        label: label.slice(0, 300),
        reason: reason.slice(0, 1000),
      });
      report(block, `${label}: ${reason}`);
    },
  };
}

export type HtmlBlockOptions = {
  /** Where the reader can find what Still can't show, phrased for each placeholder. */
  original: { interactive: string; embedded: string; table: string };
  /** Handle an inline SVG. Without a handler, SVGs are dropped. */
  svg?: (element: Element) => Promise<void>;
  /** Handle an image. Without a handler, images are dropped. */
  img?: (element: Element) => Promise<void>;
};

const BLOCK_TAGS =
  /^(?:p|div|section|article|aside|blockquote|h[1-6]|li|ul|ol|dl|dt|dd|figure|figcaption|pre|br|hr)$/;

/** Walk an HTML or XHTML element, writing prose, tables and placeholders as blocks. */
export async function writeHtmlBlocks(
  root: Element,
  writer: BlockWriter,
  options: HtmlBlockOptions,
): Promise<void> {
  const { add, unavailable } = writer;
  let buffer = "";
  const flush = () => {
    const text = buffer.replace(/\s+/gu, " ").trim();
    if (text) add({ type: "text", text });
    buffer = "";
  };
  const table = (element: Element) => {
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
        `This table contains nested tables or media, or exceeds the supported size. ${options.original.table}`,
      );
      return;
    }
    let cells = 0;
    const result: TableCell[][] = [];
    for (const row of rows) {
      const columns = Array.from(row.children).filter((c) => ["td", "th"].includes(c.localName));
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
          child.appendChild(element.ownerDocument.createTextNode(" "));
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
        `Scripts are disabled. Any static text remains readable; ${options.original.interactive}`,
      );
      return;
    }
    if (["math", "audio", "video", "iframe", "object", "canvas", "embed"].includes(tag)) {
      flush();
      const label =
        ({ math: "Formula", audio: "Audio", video: "Video" } as Record<string, string>)[tag] ??
        "Embedded content";
      unavailable(label, options.original.embedded);
      return;
    }
    if (tag === "table") {
      flush();
      table(element);
      return;
    }
    if (tag === "svg" || tag === "img") {
      const handler = tag === "svg" ? options.svg : options.img;
      if (handler) {
        flush();
        await handler(element);
      }
      return;
    }
    const block = BLOCK_TAGS.test(tag);
    if (block) flush();
    for (const child of element.childNodes) await visit(child);
    if (block) flush();
  };
  await visit(root);
  flush();
}
