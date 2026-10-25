/**
 * Prepares product photos for the catalogue:
 *
 *   pnpm catalog:image <photo> "<House>" "<Fragrance>"   one photo
 *   pnpm catalog:image <folder>                          every "House - Fragrance.jpg" in it
 *
 * Each photo has its plain light background removed (src/lib/cutout.ts), its
 * empty margin trimmed, is scaled to at most 800px tall, and is written as a
 * transparent WebP to public/catalog/<house-slug>-<fragrance-slug>.webp.
 * Metadata (EXIF, GPS) is not copied. Fragrances that prisma/data/catalogue.csv
 * doesn't list yet get a row (house and name; fill in the rest), so every
 * photo has a catalogue entry. Check each cutout on both themes.
 *
 * Photos on a busy or coloured background need a manual cutout first; the
 * script reports how much it removed so a miss is obvious.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { slugify } from "../src/lib/slug";
import { removeLightBackground } from "../src/lib/cutout";
import { appendCatalogueRows, nameFromPhotoFile } from "../src/modules/fragrances/catalogue-csv";
import { CATALOGUE_CSV, photoPath } from "./catalogue";

const PHOTO = /\.(jpe?g|png|webp|avif|heic|tiff?)$/i;

type Job = { input: string; house: string; fragrance: string };

async function cutout({ input, house, fragrance }: Job): Promise<{ out: string; share: number }> {
  const out = join("public", photoPath(slugify(house), slugify(fragrance)));
  const { data, info } = await sharp(input)
    .rotate() // honour EXIF orientation before it is dropped
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { removed } = removeLightBackground(data, info.width, info.height);

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize({ height: 800, withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(out);
  return { out, share: removed / (info.width * info.height) };
}

function jobsFrom(args: string[]): Job[] {
  const [input, house, fragrance] = args;
  if (!input) {
    throw new Error(
      'Usage: pnpm catalog:image <photo> "<House>" "<Fragrance>"\n' +
        '   or: pnpm catalog:image <folder>   (photos named "House - Fragrance.jpg")',
    );
  }
  if (statSync(input).isDirectory()) {
    const jobs: Job[] = [];
    for (const file of readdirSync(input).sort()) {
      if (!PHOTO.test(file)) continue;
      const name = nameFromPhotoFile(file);
      if (!name) {
        console.warn(`Skipped ${file}: name it "House - Fragrance${file.match(PHOTO)![0]}".`);
        continue;
      }
      jobs.push({ input: join(input, file), ...name });
    }
    return jobs;
  }
  if (!house || !fragrance)
    throw new Error('Give the house and fragrance: "<House>" "<Fragrance>".');
  return [{ input, house, fragrance }];
}

async function main() {
  const jobs = jobsFrom(process.argv.slice(2));
  if (jobs.length === 0) {
    console.log("No photos to process.");
    return;
  }
  for (const job of jobs) {
    const { out, share } = await cutout(job);
    const warn =
      share < 0.05 ? "  ← almost nothing removed: is the background plain and light?" : "";
    console.log(`${out}  (${Math.round(share * 100)}% background)${warn}`);
  }

  const { text, added } = appendCatalogueRows(readFileSync(CATALOGUE_CSV, "utf8"), jobs);
  if (added.length > 0) {
    writeFileSync(CATALOGUE_CSV, text);
    console.log(`\nAdded to ${CATALOGUE_CSV} (fill in the details):`);
    for (const a of added) console.log(`  ${a.house} — ${a.fragrance}`);
  }
  console.log(`\n${jobs.length} photo${jobs.length === 1 ? "" : "s"} done.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
