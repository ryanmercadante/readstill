// @vitest-environment jsdom
import { expect, it } from "vitest";
import { prepareSvg } from "./epub-svg";
it("sanitizes SVG before image decoding and bounds raster dimensions", () => {
  const svg = prepareSvg(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100000 50000" onload="alert(1)"><style>@import url(https://evil.invalid/style.css);</style><foreignObject><div xmlns="http://www.w3.org/1999/xhtml">unsafe</div></foreignObject><circle style="fill: red; stroke: url(https://evil.invalid/x)" r="5"/><use href="https://evil.invalid/art.svg#shape"/><script>alert(1)</script></svg>',
    () => {
      throw new Error("External resource");
    },
  );
  expect(svg.width).toBe(1600);
  expect(svg.height).toBe(800);
  expect(svg.simplified).toBe(true);
  expect(svg.source).not.toMatch(/onload|script|foreignObject|https:\/\/evil|@import/);
  expect(svg.source).toContain('fill="red"');
});
it("embeds only resolved local raster resources", () => {
  const svg = prepareSvg(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><image href="picture.png"/></svg>',
    (href) => {
      expect(href).toBe("picture.png");
      return "data:image/png;base64,YQ==";
    },
  );
  expect(svg.source).toContain("data:image/png;base64,YQ==");
  expect(() =>
    prepareSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.invalid/p.png"/></svg>',
      () => {
        throw new Error("Outside book");
      },
    ),
  ).toThrow("Outside book");
});
