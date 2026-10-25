/**
 * Applies the catalogue (see prisma/catalogue.ts) to the database in
 * DATABASE_URL. The Vercel build runs this after `prisma migrate deploy`.
 *
 *   pnpm catalog:apply           apply prisma/data/catalogue.csv (+ Wikidata snapshot)
 *   pnpm catalog:apply --check   only validate the CSV; no database needed
 */
import { PrismaClient } from "@prisma/client";
import { applyCatalogue, describeSummary, readCatalogue } from "./catalogue";

async function main() {
  if (process.argv.includes("--check")) {
    const rows = readCatalogue();
    const photos = rows.filter((r) => r.imagePath).length;
    console.log(`catalogue.csv is valid: ${rows.length} rows, ${photos} with a photo.`);
    return;
  }
  const prisma = new PrismaClient();
  try {
    console.log(describeSummary(await applyCatalogue(prisma)));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
