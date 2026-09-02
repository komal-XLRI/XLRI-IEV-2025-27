/**
 * Produces the PNG used inside emails.
 *
 * Email clients are far behind browsers on image formats — Outlook's Word
 * rendering engine does not handle WebP or SVG at all — so the portal logo is
 * converted once to a plain PNG on a white background and embedded in the
 * message itself.
 *
 *   npm run email:logo
 *
 * Re-run this whenever public/xlri-logo.* is replaced.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const SOURCES = [
  "public/xlri-logo.webp",
  "public/xlri-logo.png",
  "public/xlri-logo.svg",
  "public/xlri-logo.jpg",
];

const OUT = "public/xlri-logo-email.png";

// Rendered at 180 px wide in the email, so 2x for high-DPI displays.
const TARGET_WIDTH = 360;

const source = SOURCES.find((p) => existsSync(resolve(process.cwd(), p)));

if (!source) {
  console.error(
    `No logo found. Expected one of:\n  ${SOURCES.join("\n  ")}\n\n` +
      "Emails will fall back to a text-only header until one exists.",
  );
  process.exit(1);
}

const meta = await sharp(source).metadata();

await sharp(source)
  .resize({ width: TARGET_WIDTH, withoutEnlargement: false })
  // Emails render on white; flattening avoids a black box in clients that
  // ignore transparency.
  .flatten({ background: "#ffffff" })
  .png({ compressionLevel: 9, palette: true })
  .toFile(OUT);

const out = await sharp(OUT).metadata();
console.log(`  source  ${source}  ${meta.width}x${meta.height} ${meta.format}`);
console.log(`  written ${OUT}  ${out.width}x${out.height} png`);
console.log(`  displays at ${Math.round(TARGET_WIDTH / 2)}px wide in the email`);
