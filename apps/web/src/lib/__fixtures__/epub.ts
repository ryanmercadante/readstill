import { strToU8, zipSync } from "fflate";

export const sampleEpubFiles = {
  mimetype: "application/epub+zip",
  "META-INF/container.xml":
    '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  "OPS/book.opf": `<package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>A quiet afternoon</dc:title><dc:creator>Still fixtures</dc:creator></metadata><manifest><item id="second" href="text/second.xhtml" media-type="application/xhtml+xml"/><item id="first" href="text/first.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="picture" href="images/pixel.png" media-type="image/png"/></manifest><spine><itemref idref="first"/><itemref idref="second"/></spine></package>`,
  "OPS/nav.xhtml":
    '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol><li><a href="text/first.xhtml">The window</a></li><li><a href="text/second.xhtml">The garden</a></li></ol></nav></body></html>',
  "OPS/text/first.xhtml":
    '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>First</title></head><body><h1>At the window</h1><p>The afternoon light moved slowly. A bird rested nearby.</p><img src="../images/pixel.png" alt="A small illustration"/><p>There was time to look again.</p><aside><p>A note about the light.</p></aside></body></html>',
  "OPS/text/second.xhtml":
    '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Second</title></head><body><h1>In the garden</h1><p>We paused beneath the branches. Then walked home.</p></body></html>',
};

export function epubFixture(overrides: Record<string, string | null> = {}) {
  const files: Record<string, Uint8Array> = Object.fromEntries(
    Object.entries(sampleEpubFiles).map(([path, source]) => [path, strToU8(source)]),
  );
  files["OPS/images/pixel.png"] = Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=",
    ),
    (char) => char.charCodeAt(0),
  );
  for (const [path, source] of Object.entries(overrides)) {
    if (source === null) delete files[path];
    else files[path] = strToU8(source);
  }
  return zipSync(files);
}
