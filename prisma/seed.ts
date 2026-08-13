/**
 * Idempotent development seed. Safe to re-run.
 * Populates a small canonical fragrance catalogue only — user data is not seeded here.
 */
import { PrismaClient, Concentration, GenderClass, NoteLayer } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type SeedFragrance = {
  brand: string;
  name: string;
  concentration: Concentration;
  releaseYear?: number;
  perfumer?: string;
  gender: GenderClass;
  top: string[];
  middle: string[];
  base: string[];
  accords: Array<{ name: string; strength: number }>;
};

const FRAGRANCES: SeedFragrance[] = [
  {
    brand: "Creed",
    name: "Aventus",
    concentration: Concentration.EDP,
    releaseYear: 2010,
    perfumer: "Erwin Creed",
    gender: GenderClass.MASCULINE,
    top: ["pineapple", "bergamot", "black currant", "apple"],
    middle: ["birch", "patchouli", "moroccan jasmine", "rose"],
    base: ["oakmoss", "musk", "ambergris", "vanilla"],
    accords: [
      { name: "fruity", strength: 5 },
      { name: "smoky", strength: 4 },
      { name: "woody", strength: 4 },
      { name: "musky", strength: 3 },
    ],
  },
  {
    brand: "Parfums de Marly",
    name: "Layton",
    concentration: Concentration.EDP,
    releaseYear: 2016,
    perfumer: "Hamid Merati-Kashani",
    gender: GenderClass.UNISEX,
    top: ["bergamot", "apple", "lavender", "cardamom"],
    middle: ["geranium", "jasmine", "violet", "coffee"],
    base: ["sandalwood", "guaiac wood", "vanilla", "patchouli"],
    accords: [
      { name: "sweet", strength: 4 },
      { name: "spicy", strength: 4 },
      { name: "woody", strength: 4 },
      { name: "aromatic", strength: 3 },
    ],
  },
  {
    brand: "Maison Francis Kurkdjian",
    name: "Baccarat Rouge 540",
    concentration: Concentration.EDP,
    releaseYear: 2015,
    perfumer: "Francis Kurkdjian",
    gender: GenderClass.UNISEX,
    top: ["saffron", "jasmine"],
    middle: ["amberwood", "ambergris"],
    base: ["fir resin", "cedar"],
    accords: [
      { name: "amber", strength: 5 },
      { name: "sweet", strength: 4 },
      { name: "woody", strength: 3 },
    ],
  },
  {
    brand: "Chanel",
    name: "Bleu de Chanel",
    concentration: Concentration.EDP,
    releaseYear: 2014,
    perfumer: "Jacques Polge",
    gender: GenderClass.MASCULINE,
    top: ["grapefruit", "lemon", "mint", "pink pepper"],
    middle: ["ginger", "nutmeg", "jasmine"],
    base: ["incense", "sandalwood", "cedar", "labdanum"],
    accords: [
      { name: "woody", strength: 5 },
      { name: "aromatic", strength: 4 },
      { name: "citrus", strength: 3 },
    ],
  },
  {
    brand: "Tom Ford",
    name: "Tobacco Vanille",
    concentration: Concentration.EDP,
    releaseYear: 2007,
    perfumer: "Olivier Gillotin",
    gender: GenderClass.UNISEX,
    top: ["tobacco leaf", "spicy notes"],
    middle: ["vanilla", "cacao", "tonka bean"],
    base: ["dried fruits", "woody notes"],
    accords: [
      { name: "sweet", strength: 5 },
      { name: "gourmand", strength: 5 },
      { name: "warm-spicy", strength: 4 },
      { name: "tobacco", strength: 4 },
    ],
  },
  {
    brand: "Dior",
    name: "Sauvage",
    concentration: Concentration.EDT,
    releaseYear: 2015,
    perfumer: "François Demachy",
    gender: GenderClass.MASCULINE,
    top: ["bergamot", "pepper"],
    middle: [
      "sichuan pepper",
      "lavender",
      "pink pepper",
      "vetiver",
      "patchouli",
      "geranium",
      "elemi",
    ],
    base: ["ambroxan", "cedar", "labdanum"],
    accords: [
      { name: "aromatic", strength: 5 },
      { name: "fresh-spicy", strength: 4 },
      { name: "amber", strength: 3 },
    ],
  },
  {
    brand: "Hawas",
    name: "Hawas Ice",
    concentration: Concentration.EDP,
    releaseYear: 2022,
    gender: GenderClass.MASCULINE,
    top: ["bergamot", "lemon", "grapefruit"],
    middle: ["marine notes", "cardamom"],
    base: ["ambergris", "musk", "cedar"],
    accords: [
      { name: "aquatic", strength: 5 },
      { name: "fresh", strength: 5 },
      { name: "citrus", strength: 4 },
      { name: "musky", strength: 3 },
    ],
  },
];

async function upsertBrand(name: string) {
  const slug = slugify(name);
  return prisma.brand.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  });
}

async function upsertNote(name: string) {
  const slug = slugify(name);
  return prisma.note.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  });
}

async function upsertAccord(name: string) {
  const slug = slugify(name);
  return prisma.accord.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  });
}

async function seedFragrance(f: SeedFragrance) {
  const brand = await upsertBrand(f.brand);
  const slug = slugify(f.name);

  const fragrance = await prisma.fragrance.upsert({
    where: { brandId_slug: { brandId: brand.id, slug } },
    update: {
      name: f.name,
      concentration: f.concentration,
      releaseYear: f.releaseYear,
      perfumer: f.perfumer,
      gender: f.gender,
    },
    create: {
      brandId: brand.id,
      slug,
      name: f.name,
      concentration: f.concentration,
      releaseYear: f.releaseYear,
      perfumer: f.perfumer,
      gender: f.gender,
    },
  });

  const linkNotes = async (names: string[], layer: NoteLayer) => {
    for (const n of names) {
      const note = await upsertNote(n);
      await prisma.fragranceNote.upsert({
        where: {
          fragranceId_noteId_layer: {
            fragranceId: fragrance.id,
            noteId: note.id,
            layer,
          },
        },
        update: {},
        create: { fragranceId: fragrance.id, noteId: note.id, layer },
      });
    }
  };

  await linkNotes(f.top, NoteLayer.TOP);
  await linkNotes(f.middle, NoteLayer.MIDDLE);
  await linkNotes(f.base, NoteLayer.BASE);

  for (const a of f.accords) {
    const accord = await upsertAccord(a.name);
    await prisma.fragranceAccord.upsert({
      where: {
        fragranceId_accordId: { fragranceId: fragrance.id, accordId: accord.id },
      },
      update: { strength: a.strength },
      create: { fragranceId: fragrance.id, accordId: accord.id, strength: a.strength },
    });
  }
}

async function main() {
  for (const f of FRAGRANCES) {
    await seedFragrance(f);
  }
  const count = await prisma.fragrance.count();
  // eslint-disable-next-line no-console
  console.log(`Seed complete. Canonical fragrances in DB: ${count}`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
