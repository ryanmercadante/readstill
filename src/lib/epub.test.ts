// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { epubFixture, sampleEpubFiles } from "./__fixtures__/epub";
import { epubPath, importEpub } from "./epub";
import { validReading } from "./library";

const body = (content: string) =>
  `<html xmlns="http://www.w3.org/1999/xhtml"><body>${content}</body></html>`;

describe("EPUB import", () => {
  it("uses spine order, TOC labels, prose, footnotes, and local illustrations", async () => {
    const book = await importEpub(epubFixture(), "fallback");
    expect(book.title).toBe("A quiet afternoon");
    expect(book.author).toBe("Still fixtures");
    expect(book.chapters.map((c) => c.title)).toEqual(["The window", "The garden"]);
    expect(book.chapters[0].text).toContain("A note about the light.");
    expect(book.chapters[0].images[0]).toMatchObject({
      beforeParagraph: 2,
      alt: "A small illustration",
    });
    expect(book.chapters[0].images[0].src).toMatch(/^data:image\/png;base64,/);
    expect(validReading(book)).toBe(true);
  });
  it("never includes scripts or presentation styles in reading content", async () => {
    const book = await importEpub(
      epubFixture({
        "OPS/text/first.xhtml": body(
          '<script>window.stolen = true;</script><style>body {color:red}</style><p onclick="alert(1)">Safe <em>reading</em>.</p>',
        ),
      }),
      "fallback",
    );
    expect(book.chapters[0].text).toBe("Safe reading.");
  });
  it("preserves raster covers wrapped in SVG and contents tables as chapter lists", async () => {
    const book = await importEpub(
      epubFixture({
        "OPS/text/first.xhtml": body(
          '<svg xmlns="http://www.w3.org/2000/svg"><title>Book cover</title><image href="../images/pixel.png" /></svg><table><tr><td><a href="second.xhtml">Chapter two</a></td><td>The garden</td></tr></table>',
        ),
      }),
      "fallback",
    );
    expect(book.chapters[0].text).toBe("Chapter two The garden");
    expect(book.chapters[0].images[0].alt).toBe("Book cover");
    await expect(
      importEpub(
        epubFixture({
          "OPS/text/first.xhtml": body(
            '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" /></svg>',
          ),
        }),
        "fallback",
      ),
    ).rejects.toThrow("can't preserve");
  });
  it("supports EPUB 2 NCX chapter labels and percent-encoded paths", async () => {
    const opf = sampleEpubFiles["OPS/book.opf"]
      .replace('version="3.0"', 'version="2.0"')
      .replace(
        'href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"',
        'href="toc.ncx" media-type="application/x-dtbncx+xml"',
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
    expect(epubPath("OPS/text/first.xhtml", "../images/an%20image.png")).toBe(
      "OPS/images/an image.png",
    );
    expect(() => epubPath("OPS/book.opf", "https://example.com/chapter.xhtml")).toThrow();
  });
  it("rejects broken, encrypted, fixed-layout, and unsupported content without partial imports", async () => {
    const fixtures = [
      epubFixture({ "OPS/text/second.xhtml": null }),
      epubFixture({ "OPS/text/first.xhtml": "<html><broken>" }),
      epubFixture({
        "OPS/text/first.xhtml": body("<table><tr><td>Important data</td></tr></table>"),
      }),
      epubFixture({ "OPS/text/first.xhtml": body('<img src="https://example.com/pixel.png"/>') }),
      epubFixture({
        "OPS/book.opf": sampleEpubFiles["OPS/book.opf"].replace(
          "</metadata>",
          '<meta property="rendition:layout">pre-paginated</meta></metadata>',
        ),
      }),
      epubFixture({
        "META-INF/encryption.xml":
          '<encryption><EncryptedData><CipherData><CipherReference URI="OPS/text/first.xhtml"/></CipherData></EncryptedData></encryption>',
      }),
      epubFixture({ "OPS/text/first.xhtml": body(`<p>${"a".repeat(100_001)}</p>`) }),
      new Uint8Array([0, 1, 2, 3]),
    ];
    for (const fixture of fixtures) await expect(importEpub(fixture, "fallback")).rejects.toThrow();
  });
  it("rejects oversized archive resources before inflation", async () => {
    await expect(
      importEpub(epubFixture({ "OPS/oversized.xhtml": "a".repeat(5_000_001) }), "fallback"),
    ).rejects.toThrow("expands beyond");
    await expect(importEpub(new Uint8Array(25_000_001), "fallback")).rejects.toThrow(
      "smaller than 25 MB",
    );
  });
});
