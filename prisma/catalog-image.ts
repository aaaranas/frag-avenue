/**
 * Prepares a product photo for the catalogue:
 *
 *   pnpm catalog:image <photo> "<House>" "<Fragrance>"
 *
 * Removes a plain light background (src/lib/cutout.ts), trims the empty
 * margin, scales to at most 800px tall, and writes a transparent WebP to
 * public/catalog/<house-slug>-<fragrance-slug>.webp. Metadata (EXIF, GPS) is
 * not copied. Then set `image` on the fragrance in prisma/seed.ts to the path
 * it prints, and check the cutout on both themes.
 *
 * Photos on a busy or coloured background need a manual cutout first; the
 * script reports how much it removed so a miss is obvious.
 */
import sharp from "sharp";
import { slugify } from "../src/lib/slug";
import { removeLightBackground } from "../src/lib/cutout";

async function main() {
  const [input, house, fragrance] = process.argv.slice(2);
  if (!input || !house || !fragrance) {
    console.error('Usage: pnpm catalog:image <photo> "<House>" "<Fragrance>"');
    process.exit(1);
  }
  const name = `${slugify(house)}-${slugify(fragrance)}`;
  const out = `public/catalog/${name}.webp`;

  const { data, info } = await sharp(input)
    .rotate() // honour EXIF orientation before it is dropped
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { removed } = removeLightBackground(data, info.width, info.height);
  const share = removed / (info.width * info.height);

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize({ height: 800, withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(out);

  console.log(`Wrote ${out} (${Math.round(share * 100)}% of the photo was background).`);
  if (share < 0.05) {
    console.warn("Almost nothing was removed: is the background plain and light?");
  }
  console.log(`In prisma/seed.ts: image: "/catalog/${name}.webp"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
