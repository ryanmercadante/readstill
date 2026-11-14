import { epubFixture, sampleEpubFiles } from "../../src/lib/__fixtures__/epub";

export const passage =
  "First sentence ends here. A second sentence is here.\n\nThe final paragraph has a few words.";
export const standardBook = Buffer.from(epubFixture());
export const workerBook = Buffer.from(
  epubFixture({
    "OPS/text/first.xhtml": sampleEpubFiles["OPS/text/first.xhtml"].replace(
      "</head>",
      `<style>/*${" ".repeat(400_000)}*/</style></head>`,
    ),
  }),
);
export const richBook = Buffer.from(
  epubFixture({
    "OPS/text/first.xhtml":
      '<html xmlns="http://www.w3.org/1999/xhtml"><body><p>Before the table.</p><table><caption>Reading results</caption><tr><th scope="col" colspan="2">Results</th></tr><tr><th scope="row" rowspan="2">2026</th><td>42</td></tr><tr><td>43</td></tr></table><p>After the table.</p><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" onload="window.evil=true"><title>Red circle</title><style>@import url(https://evil.invalid/style.css);</style><circle cx="40" cy="40" r="30" fill="red"/><foreignObject><img xmlns="http://www.w3.org/1999/xhtml" src="https://evil.invalid/pixel.png"/></foreignObject><script>window.evil=true</script></svg><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>+</mo><mn>1</mn></math><p>Final prose stays available.</p></body></html>',
  }),
);
