// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { imageAddress } from "./web-images";

const base = new URL("https://quiet.example/essays/slow");
const img = (attributes: string) => {
  const doc = new DOMParser().parseFromString(`<img ${attributes}>`, "text/html");
  return doc.querySelector("img")!;
};
const inline = (length: number) => `data:image/png;base64,${"A".repeat(length)}`;

describe("article image addresses", () => {
  it("resolves src against the page", () => {
    expect(imageAddress(img('src="/photos/chair.jpg"'), base)).toBe(
      "https://quiet.example/photos/chair.jpg",
    );
  });
  it("prefers the srcset candidate closest to 1600px wide", () => {
    expect(
      imageAddress(
        img('src="s.jpg" srcset="a-400.jpg 400w, a-1200.jpg 1200w, a-2400.jpg 2400w"'),
        base,
      ),
    ).toBe("https://quiet.example/essays/a-1200.jpg");
    expect(imageAddress(img('srcset="huge.jpg 3000w, big.jpg 2000w"'), base)).toBe(
      "https://quiet.example/essays/big.jpg",
    );
    expect(imageAddress(img('srcset="x1.jpg, x2.jpg 2x"'), base)).toBe(
      "https://quiet.example/essays/x1.jpg",
    );
  });
  it("finds lazy-loaded images behind placeholders", () => {
    expect(imageAddress(img(`src="${inline(40)}" data-src="/real.jpg"`), base)).toBe(
      "https://quiet.example/real.jpg",
    );
    expect(imageAddress(img(`src="${inline(3000)}"`), base)).toBe(inline(3000));
  });
  it("skips icons, pixels and unsupported addresses", () => {
    expect(imageAddress(img('src="/pixel.gif" width="1" height="1"'), base)).toBeNull();
    expect(imageAddress(img('src="/icon.png" width="24"'), base)).toBeNull();
    expect(imageAddress(img(`src="${inline(40)}"`), base)).toBeNull();
    expect(imageAddress(img('src="javascript:alert(1)"'), base)).toBeNull();
    expect(imageAddress(img('src="data:image/svg+xml;base64,PHN2Zy8+"'), base)).toBeNull();
    expect(imageAddress(img(""), base)).toBeNull();
  });
});
