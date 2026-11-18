import { describe, expect, it, vi } from "vitest";
import {
  fetchImage,
  fetchPage,
  MAX_IMAGE_BYTES,
  MAX_PAGE_BYTES,
  publicPageUrl,
} from "./fetch-page";

const html = (body: string, headers: Record<string, string> = {}) =>
  new Response(body, { headers: { "content-type": "text/html; charset=utf-8", ...headers } });
const redirect = (location: string) => new Response(null, { status: 302, headers: { location } });

describe("publicPageUrl", () => {
  it("accepts ordinary public pages and drops the fragment", () => {
    expect(publicPageUrl(" https://example.com/essay?x=1#part ").href).toBe(
      "https://example.com/essay?x=1",
    );
    expect(publicPageUrl("http://news.example.org:80/a").href).toBe("http://news.example.org/a");
  });
  it.each([
    "example.com/no-scheme",
    "ftp://example.com/file",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "https://user:pass@example.com/",
    "https://example.com:8080/",
    "http://localhost/",
    "http://app.localhost/",
    "http://printer.local/",
    "http://metadata.internal/",
    "http://intranet/",
    "http://127.0.0.1/",
    "http://2130706433/",
    "http://0x7f.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
    `https://example.com/${"a".repeat(2048)}`,
  ])("rejects %s", (address) => {
    expect(() => publicPageUrl(address)).toThrow();
  });
});

describe("fetchPage", () => {
  it("returns the final address and decoded HTML", async () => {
    const fetcher = vi.fn(async () => html("<p>Café</p>"));
    await expect(fetchPage("https://example.com/a#x", fetcher)).resolves.toEqual({
      url: "https://example.com/a",
      html: "<p>Café</p>",
    });
    expect(fetcher).toHaveBeenCalledWith(
      new URL("https://example.com/a"),
      expect.objectContaining({ redirect: "manual" }),
    );
  });
  it("follows redirects, checking every hop", async () => {
    const ok = vi
      .fn()
      .mockResolvedValueOnce(redirect("/moved"))
      .mockResolvedValueOnce(html("<p>Here</p>"));
    await expect(fetchPage("https://example.com/a", ok)).resolves.toMatchObject({
      url: "https://example.com/moved",
    });
    const internal = vi.fn().mockResolvedValueOnce(redirect("http://127.0.0.1/admin"));
    await expect(fetchPage("https://example.com/a", internal)).rejects.toThrow("public web pages");
    expect(internal).toHaveBeenCalledTimes(1);
    const loop = vi.fn(async () => redirect("/again"));
    await expect(fetchPage("https://example.com/a", loop)).rejects.toThrow("redirects too many");
    expect(loop).toHaveBeenCalledTimes(6);
  });
  it("uses the page's declared charset", async () => {
    const latin1 = new Uint8Array([0x3c, 0x70, 0x3e, 0x63, 0x61, 0x66, 0xe9]); // <p>café
    const response = new Response(latin1, { headers: { "content-type": "text/html" } });
    const page = new Uint8Array([
      ...new TextEncoder().encode('<meta charset="iso-8859-1">'),
      ...latin1,
    ]);
    await expect(fetchPage("https://example.com/", async () => response)).resolves.toMatchObject({
      html: "<p>caf�",
    });
    await expect(
      fetchPage(
        "https://example.com/",
        async () => new Response(page, { headers: { "content-type": "text/html" } }),
      ),
    ).resolves.toMatchObject({ html: '<meta charset="iso-8859-1"><p>café' });
  });
  it("refuses files, oversized pages and error responses with readable messages", async () => {
    const pdf = async () =>
      new Response("%PDF", { headers: { "content-type": "application/pdf" } });
    await expect(fetchPage("https://example.com/", pdf)).rejects.toThrow("isn't a web page");
    const declared = async () => html("", { "content-length": String(MAX_PAGE_BYTES + 1) });
    await expect(fetchPage("https://example.com/", declared)).rejects.toThrow("too large");
    const streamed = async () => html("a".repeat(MAX_PAGE_BYTES + 1));
    await expect(fetchPage("https://example.com/", streamed)).rejects.toThrow("too large");
    const paywall = async () => new Response("", { status: 403 });
    await expect(fetchPage("https://example.com/", paywall)).rejects.toThrow("sign-in");
    const missing = async () => new Response("", { status: 404 });
    await expect(fetchPage("https://example.com/", missing)).rejects.toThrow("wasn't found");
    const offline = async () => {
      throw new TypeError("network");
    };
    await expect(fetchPage("https://example.com/", offline)).rejects.toThrow("couldn't reach");
  });
});

describe("fetchImage", () => {
  const image = (type: string, body: BodyInit = new Uint8Array([1, 2, 3])) =>
    new Response(body, { headers: { "content-type": type } });
  it("returns raster image bytes with a clean type", async () => {
    await expect(
      fetchImage("https://cdn.example/a.jpg", async () => image("image/JPEG; charset=binary")),
    ).resolves.toEqual({ type: "image/jpeg", bytes: new Uint8Array([1, 2, 3]) });
    for (const type of ["image/png", "image/gif", "image/webp", "image/avif"])
      await expect(
        fetchImage("https://cdn.example/a", async () => image(type)),
      ).resolves.toMatchObject({ type });
  });
  it("refuses SVG, HTML, oversized and private images", async () => {
    for (const type of ["image/svg+xml", "text/html", "image/pngx", "application/octet-stream"])
      await expect(fetchImage("https://cdn.example/a", async () => image(type))).rejects.toThrow(
        "format",
      );
    const huge = async () => image("image/png", new Uint8Array(MAX_IMAGE_BYTES + 1));
    await expect(fetchImage("https://cdn.example/a", huge)).rejects.toThrow("too large");
    const never = vi.fn();
    await expect(fetchImage("http://10.0.0.1/a.png", never)).rejects.toThrow();
    expect(never).not.toHaveBeenCalled();
  });
});
