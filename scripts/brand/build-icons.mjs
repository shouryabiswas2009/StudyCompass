// Builds the site's icons from the logo mark in components/brand/mark.ts, so
// they always match the logo. Run again whenever the mark changes:
//
//   npm run brand:icons
//
// Writes:
//   app/icon.svg          browser tab icon (green tile, white mark)
//   app/apple-icon.png    180×180, for iPhone/iPad home screens
//   public/icon-512.png   512×512, for installs (manifest) and share previews
//
// Uses sharp, the image library Next.js already installs for next/image.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { markSvg } from "../../components/brand/mark.ts";

const ROOT = join(import.meta.dirname, "..", "..");
const GREEN = "#1e4d3a"; // --primary in app/globals.css
const WHITE = "#ffffff";

// Browser tab: a rounded tile so the mark reads on light and dark tabs.
writeFileSync(join(ROOT, "app", "icon.svg"), markSvg(WHITE, { size: 32, background: GREEN, padding: 4 }) + "\n");

// PNGs: square tiles (phones round the corners themselves).
async function png(size, file) {
  const svg = markSvg(WHITE, { size, padding: 6 });
  const mark = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: GREEN } })
    .composite([{ input: mark }])
    .png()
    .toFile(join(ROOT, file));
}
await png(180, "app/apple-icon.png");
await png(512, "public/icon-512.png");
console.log("Wrote app/icon.svg, app/apple-icon.png, public/icon-512.png");
