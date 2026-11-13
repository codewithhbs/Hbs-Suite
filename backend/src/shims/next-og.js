import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

/** next/og ImageResponse replacement: satori (JSX tree -> SVG) + resvg (SVG -> PNG). */
const FONT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib", "reports", "fonts");
let defaults = null;
function defaultFonts() {
  if (defaults) return defaults;
  const read = (f) => {
    try {
      return fs.readFileSync(path.join(FONT_DIR, f));
    } catch {
      return null;
    }
  };
  defaults = [
    { name: "Inter", data: read("inter-latin-400-normal.woff"), weight: 400, style: "normal" },
    { name: "Inter", data: read("inter-latin-600-normal.woff"), weight: 600, style: "normal" },
    { name: "Inter", data: read("inter-latin-700-normal.woff"), weight: 700, style: "normal" },
    { name: "Noto Deva", data: read("noto-sans-devanagari-devanagari-400-normal.woff"), weight: 400, style: "normal" },
  ].filter((f) => f.data);
  return defaults;
}

export class ImageResponse extends Response {
  constructor(element, options = {}) {
    const { width = 1200, height = 630, fonts, headers = {}, status = 200 } = options;
    const body = new ReadableStream({
      async start(controller) {
        try {
          const svg = await satori(element, { width, height, fonts: fonts?.length ? fonts : defaultFonts() });
          const png = new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
          controller.enqueue(new Uint8Array(png));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });
    super(body, { status, headers: { "content-type": "image/png", "cache-control": "no-store", ...headers } });
  }
}
