import DOMPurify from "dompurify";

const SVG_NS = "http://www.w3.org/2000/svg";
const safeStyle = new Set([
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "font-size",
  "font-family",
  "font-weight",
  "font-style",
  "text-anchor",
  "dominant-baseline",
  "display",
  "visibility",
]);
const rasterData = /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+=*$/;

/** Produce a bounded, self-contained SVG solely for decoding as an image. */
export function prepareSvg(
  source: string,
  resolveImage: (href: string) => string,
): { source: string; width: number; height: number; simplified: boolean } {
  if (/<!ENTITY/i.test(source)) throw new Error("This illustration uses unsupported XML entities.");
  const doc = new DOMParser().parseFromString(source, "application/xml");
  const svg = doc.documentElement;
  if (
    svg.localName !== "svg" ||
    svg.namespaceURI !== SVG_NS ||
    doc.getElementsByTagName("parsererror").length
  )
    throw new Error("This SVG illustration couldn't be read.");
  const nodes = [svg, ...svg.querySelectorAll("*")];
  if (nodes.length > 20_000) throw new Error("This SVG illustration is too complex to display.");
  let simplified = false;
  for (const node of nodes) {
    if (
      node.namespaceURI !== SVG_NS ||
      [
        "script",
        "foreignObject",
        "style",
        "animate",
        "animateTransform",
        "animateMotion",
        "set",
        "feImage",
      ].includes(node.localName)
    ) {
      node.remove();
      simplified = true;
      continue;
    }
    if (node.hasAttribute("style")) {
      for (const declaration of node.getAttribute("style")!.split(";")) {
        const separator = declaration.indexOf(":");
        if (separator < 0) continue;
        const property = declaration.slice(0, separator).trim().toLowerCase();
        const value = declaration.slice(separator + 1).trim();
        if (
          safeStyle.has(property) &&
          !/[\\@<>]/.test(value) &&
          !/expression|var\(/i.test(value) &&
          (!/url\s*\(/i.test(value) || /^url\(#[\w.-]+\)$/.test(value))
        )
          node.setAttribute(property, value);
        else simplified = true;
      }
      node.removeAttribute("style");
    }
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.localName.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith("on") || name === "base" || name === "src" || name === "class") {
        node.removeAttributeNode(attribute);
        simplified = true;
      } else if (name === "href") {
        if (node.localName === "image") {
          const data =
            rasterData.test(value) && value.length <= 7_000_000 ? value : resolveImage(value);
          node.removeAttributeNode(attribute);
          node.setAttribute("href", data);
        } else if (!/^#[\w.-]+$/.test(value)) {
          node.removeAttributeNode(attribute);
          simplified = true;
        }
      } else if (/url\s*\(/i.test(value) && !/^url\(#[\w.-]+\)$/.test(value)) {
        node.removeAttributeNode(attribute);
        simplified = true;
      }
    }
  }
  const viewBox = (svg.getAttribute("viewBox") ?? "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const width =
    viewBox.length === 4 && viewBox[2] > 0
      ? viewBox[2]
      : parseFloat(svg.getAttribute("width") ?? "600");
  const height =
    viewBox.length === 4 && viewBox[3] > 0
      ? viewBox[3]
      : parseFloat(svg.getAttribute("height") ?? "400");
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    throw new Error("This SVG illustration has invalid dimensions.");
  const scale = Math.min(1, 1600 / Math.max(width, height));
  const outputWidth = Math.max(1, Math.round(width * scale));
  const outputHeight = Math.max(1, Math.round(height * scale));
  svg.setAttribute("width", String(outputWidth));
  svg.setAttribute("height", String(outputHeight));
  if (!svg.hasAttribute("viewBox")) svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("xmlns", SVG_NS);
  const clean = DOMPurify.sanitize(new XMLSerializer().serializeToString(svg), {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: [
      "foreignObject",
      "script",
      "style",
      "animate",
      "animateMotion",
      "animateTransform",
      "set",
      "feImage",
    ],
    FORBID_ATTR: ["style"],
    ADD_DATA_URI_TAGS: ["image"],
    RETURN_TRUSTED_TYPE: false,
  });
  simplified ||= DOMPurify.removed.length > 0;
  return { source: clean, width: outputWidth, height: outputHeight, simplified };
}

export async function rasterizeSvg(svg: ReturnType<typeof prepareSvg>): Promise<string> {
  const url = URL.createObjectURL(new Blob([svg.source], { type: "image/svg+xml" }));
  const image = new Image();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("This SVG illustration couldn't be displayed."));
      timer = setTimeout(() => {
        image.src = "";
        reject(new Error("This SVG illustration took too long to display."));
      }, 5000);
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = svg.width;
    canvas.height = svg.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser couldn't prepare the SVG illustration.");
    context.drawImage(image, 0, 0, svg.width, svg.height);
    const src = canvas.toDataURL("image/png");
    if (src.length > 7_000_000) throw new Error("This SVG illustration is too large to store.");
    return src;
  } finally {
    clearTimeout(timer);
    image.onload = null;
    image.onerror = null;
    URL.revokeObjectURL(url);
  }
}
