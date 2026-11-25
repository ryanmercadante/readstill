// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { epubFixture, sampleEpubFiles } from "./__fixtures__/epub";
import { epubPath, importEpub } from "./epub";
import { validReading } from "./library";
import { chapterSequence, chapterText } from "@still/reader-core";
vi.mock("./epub-svg", async (original) => ({
  ...(await original<typeof import("./epub-svg")>()),
  rasterizeSvg: vi.fn(async () => "data:image/png;base64,YQ=="),
}));
const body = (content: string) =>
  `<html xmlns="http://www.w3.org/1999/xhtml"><body>${content}</body></html>`;
describe("EPUB import", () => {
  it("preserves spine order, TOC labels, prose, footnotes, illustrations, and exact original bytes", async () => {
    const input = epubFixture();
    const book = await importEpub(input, "fallback", "original.epub");
    expect(book.title).toBe("A quiet afternoon");
    expect(book.author).toBe("Still fixtures");
    expect(book.chapters.map((c) => c.title)).toEqual(["The window", "The garden"]);
    expect(chapterText(book.chapters[0])).toContain("A note about the light.");
    expect(book.chapters[0].blocks[2]).toMatchObject({
      type: "image",
      alt: "A small illustration",
    });
    expect(Uint8Array.from(atob(book.originalEpub!.data), (c) => c.charCodeAt(0))).toEqual(input);
    expect(validReading(book)).toBe(true);
  });
  it("keeps data tables structured and stops playback at their location", async () => {
    const book = await importEpub(
      epubFixture({
        "OPS/text/first.xhtml": body(
          '<p>Before.</p><table><caption>Results</caption><tr><th scope="col" colspan="2">Year</th></tr><tr><th scope="row">2026</th><td>42</td></tr></table><p>After.</p>',
        ),
      }),
      "fallback",
    );
    expect(book.chapters[0].blocks[1]).toMatchObject({
      type: "table",
      caption: "Results",
      rows: [
        [{ text: "Year", header: true, colSpan: 2, scope: "col" }],
        [
          { text: "2026", header: true, scope: "row" },
          { text: "42", header: false },
        ],
      ],
    });
    expect(
      chapterSequence(book.chapters[0]).map((entry) => entry.context?.type ?? entry.text),
    ).toEqual(["Before.", "table", "After."]);
    expect(book.importIssues).toEqual([]);
  });
  it("retains SVG as raster images and reports simplification", async () => {
    const book = await importEpub(
      epubFixture({
        "OPS/text/first.xhtml": body(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><title>A circle</title><circle cx="50" cy="50" r="40" fill="red"/><script>alert(1)</script></svg>',
        ),
      }),
      "fallback",
    );
    expect(book.chapters[0].blocks[0]).toMatchObject({
      type: "image",
      alt: "A circle",
      src: "data:image/png;base64,YQ==",
    });
    expect(book.importIssues?.[0].message).toContain("simplified");
    expect(validReading(book)).toBe(true);
  });
  it("marks unsupported sections and external resources without losing surrounding prose", async () => {
    const book = await importEpub(
      epubFixture({
        "OPS/text/first.xhtml": body(
          '<p>Before.</p><math><mi>x</mi></math><video src="movie.mp4"/><img src="https://example.com/tracker.png"/><p onclick="alert(1)">After.</p>',
        ),
      }),
      "fallback",
    );
    expect(book.chapters[0].blocks.map((b) => b.type)).toEqual([
      "text",
      "unsupported",
      "unsupported",
      "unsupported",
      "text",
    ]);
    expect(chapterText(book.chapters[0])).toBe("Before.\n\nAfter.");
    expect(book.importIssues).toHaveLength(3);
    expect(validReading(book)).toBe(true);
  });
  it("uses publisher fallbacks and EPUB 2 NCX navigation", async () => {
    const opf = sampleEpubFiles["OPS/book.opf"]
      .replace('version="3.0"', 'version="2.0"')
      .replace(
        'href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"',
        'href="toc.ncx" media-type="application/x-dtbncx+xml"',
      )
      .replace("<spine>", "<manifest-extra/><spine>")
      .replace('<itemref idref="first"/>', '<itemref idref="foreign"/>')
      .replace(
        "</manifest>",
        '<item id="foreign" href="foreign.bin" media-type="application/octet-stream" fallback="first"/></manifest>',
      );
    const book = await importEpub(
      epubFixture({
        "OPS/book.opf": opf,
        "OPS/toc.ncx":
          '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/"><navMap><navPoint><navLabel><text>An NCX chapter</text></navLabel><content src="text/first.xhtml"/></navPoint></navMap></ncx>',
      }),
      "fallback",
    );
    expect(book.chapters[0].title).toBe("An NCX chapter");
    expect(book.importIssues?.[0].message).toContain("publisher-provided fallback");
    expect(epubPath("OPS/text/first.xhtml", "../images/an%20image.png")).toBe(
      "OPS/images/an image.png",
    );
    expect(() => epubPath("OPS/book.opf", "https://example.com/chapter.xhtml")).toThrow();
  });
  it("rejects broken, encrypted, fixed-layout, and oversized input", async () => {
    for (const fixture of [
      epubFixture({ "OPS/text/second.xhtml": null }),
      epubFixture({ "OPS/text/first.xhtml": "<html><broken>" }),
      epubFixture({
        "OPS/book.opf": sampleEpubFiles["OPS/book.opf"].replace(
          "</metadata>",
          '<meta property="rendition:layout">pre-paginated</meta></metadata>',
        ),
      }),
      epubFixture({
        "META-INF/encryption.xml":
          '<encryption><CipherReference URI="OPS/text/first.xhtml"/></encryption>',
      }),
      epubFixture({ "OPS/text/first.xhtml": body(`<p>${"a".repeat(100_001)}</p>`) }),
      new Uint8Array([0, 1, 2, 3]),
    ])
      await expect(importEpub(fixture, "fallback")).rejects.toThrow();
    await expect(
      importEpub(epubFixture({ "OPS/oversized.xhtml": "a".repeat(5_000_001) }), "fallback"),
    ).rejects.toThrow("expands beyond");
    await expect(importEpub(new Uint8Array(50_000_001), "fallback")).rejects.toThrow(
      "smaller than 50 MB",
    );
  });
});
