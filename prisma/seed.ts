/**
 * Idempotent development seed. Safe to re-run.
 *
 * Two parts:
 *   1. The canonical fragrance catalogue — shared by every user, upserted.
 *   2. A deterministic development account (see DEV_USER) with a collection and
 *      wear history, so a fresh clone is usable immediately and the Playwright
 *      suite has a fixed account to sign in as.
 *
 * Part 2 is skipped in production unless SEED_DEV_USER=true.
 */
import {
  PrismaClient,
  BottleCondition,
  BottleShape,
  Concentration,
  Environment,
  GenderClass,
  GlassFinish,
  NoteLayer,
  Occasion,
  WeatherSource,
} from "@prisma/client";
import bcrypt from "bcryptjs";

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
  /**
   * Curated bottle appearance — the silhouette and colours of the official
   * flacon, and nothing else. No logos, no label artwork, no trade dress. On a
   * CLEAR bottle `glassColor` describes the juice; on an OPAQUE one it
   * describes the glass itself.
   */
  bottle?: {
    shape: BottleShape;
    glassColor: string;
    capColor: string;
    finish: GlassFinish;
  };
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
    bottle: {
      shape: BottleShape.FLASK,
      glassColor: "#3f4448",
      capColor: "#17171a",
      finish: GlassFinish.OPAQUE,
    },
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
    bottle: {
      shape: BottleShape.CYLINDRICAL,
      glassColor: "#2f4a7a",
      capColor: "#c9a227",
      finish: GlassFinish.OPAQUE,
    },
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
    bottle: {
      shape: BottleShape.RECTANGULAR,
      glassColor: "#c94f3d",
      capColor: "#c8a95c",
      finish: GlassFinish.CLEAR,
    },
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
    bottle: {
      shape: BottleShape.RECTANGULAR,
      glassColor: "#1c2b45",
      capColor: "#141b28",
      finish: GlassFinish.OPAQUE,
    },
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
    bottle: {
      shape: BottleShape.RECTANGULAR,
      glassColor: "#6b4423",
      capColor: "#2b1d12",
      finish: GlassFinish.OPAQUE,
    },
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
    bottle: {
      shape: BottleShape.TAPERED,
      glassColor: "#7d93a8",
      capColor: "#2a3746",
      finish: GlassFinish.CLEAR,
    },
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
    bottle: {
      shape: BottleShape.TAPERED,
      glassColor: "#5b9fd4",
      capColor: "#b9c3cb",
      finish: GlassFinish.CLEAR,
    },
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

/**
 * Curation is optional and re-runs must not wipe it, so an uncurated entry
 * contributes no keys at all rather than four explicit nulls.
 */
function bottleFields(f: SeedFragrance) {
  if (!f.bottle) return {};
  return {
    bottleShape: f.bottle.shape,
    glassColor: f.bottle.glassColor,
    capColor: f.bottle.capColor,
    glassFinish: f.bottle.finish,
  };
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
      ...bottleFields(f),
    },
    create: {
      brandId: brand.id,
      slug,
      name: f.name,
      concentration: f.concentration,
      releaseYear: f.releaseYear,
      perfumer: f.perfumer,
      gender: f.gender,
      ...bottleFields(f),
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

// ------------------------------------------------------------------
// Development account
// ------------------------------------------------------------------

/**
 * The credentials a fresh clone signs in with, and the account the Playwright
 * suite drives. Documented in README.md — keep them in sync.
 */
export const DEV_USER = {
  email: "dev@frag.test",
  password: "devpassword123",
  name: "Dev Avenue",
  timezone: "Asia/Manila",
  currency: "PHP",
} as const;

// Mirrors ROUNDS in src/modules/auth/passwords.ts. That module is `server-only`
// and cannot be imported from a plain Node script, so the cost factor is
// repeated here — the resulting hash is verified by the same bcrypt library.
const BCRYPT_ROUNDS = 12;

const DAY_MS = 86_400_000;

/** A fixed wall-clock hour keeps re-runs from drifting within the day. */
function daysAgo(days: number, hour = 8): Date {
  const d = new Date(Date.now() - days * DAY_MS);
  d.setHours(hour, 0, 0, 0);
  return d;
}

type SeedCollectionItem = {
  key: string; // "<brand slug>/<fragrance slug>"
  bottleSizeMl: number;
  remainingMl: number;
  priceMinor: number; // PHP centavos
  ownedForDays: number;
  condition: BottleCondition;
  personalRating: number;
  personalNotes?: string;
};

/**
 * Fill levels are deliberately spread across the range so the bottle renderer's
 * liquid level is visibly different card to card. Tobacco Vanille is the
 * intentional "neglected" case: owned well past 90 days, last worn past 60.
 */
const COLLECTION: SeedCollectionItem[] = [
  {
    key: "creed/aventus",
    bottleSizeMl: 100,
    remainingMl: 62,
    priceMinor: 1_795_000,
    ownedForDays: 210,
    condition: BottleCondition.USED,
    personalRating: 5,
    personalNotes: "Still the benchmark. Batch variation is real but this one is excellent.",
  },
  {
    key: "parfums-de-marly/layton",
    bottleSizeMl: 125,
    remainingMl: 96,
    priceMinor: 1_650_000,
    ownedForDays: 150,
    condition: BottleCondition.USED,
    personalRating: 5,
    personalNotes: "Cold-weather workhorse. Two sprays is plenty.",
  },
  {
    key: "maison-francis-kurkdjian/baccarat-rouge-540",
    bottleSizeMl: 70,
    remainingMl: 41,
    priceMinor: 2_450_000,
    ownedForDays: 120,
    condition: BottleCondition.USED,
    personalRating: 4,
    personalNotes: "Divisive up close, superb at a distance.",
  },
  {
    key: "chanel/bleu-de-chanel",
    bottleSizeMl: 100,
    remainingMl: 78,
    priceMinor: 895_000,
    ownedForDays: 300,
    condition: BottleCondition.USED,
    personalRating: 4,
    personalNotes: "Safest possible office pick.",
  },
  {
    key: "tom-ford/tobacco-vanille",
    bottleSizeMl: 50,
    remainingMl: 44,
    priceMinor: 1_890_000,
    ownedForDays: 240,
    condition: BottleCondition.USED,
    personalRating: 3,
    personalNotes: "Too heavy for Manila. Waiting for a trip somewhere cold.",
  },
  {
    key: "dior/sauvage",
    bottleSizeMl: 100,
    remainingMl: 25,
    priceMinor: 720_000,
    ownedForDays: 400,
    condition: BottleCondition.USED,
    personalRating: 3,
    personalNotes: "Bought before I knew better. Still performs.",
  },
  {
    key: "hawas/hawas-ice",
    bottleSizeMl: 100,
    remainingMl: 88,
    priceMinor: 385_000,
    ownedForDays: 40,
    condition: BottleCondition.NEW,
    personalRating: 4,
    personalNotes: "Absurd value. The hot-weather default now.",
  },
];

type SeedWear = {
  key: string;
  days: number;
  sprays: number;
  occasion: Occasion;
  environment: Environment;
  temperatureC: number;
  humidityPct: number;
  weatherCondition: string;
  longevityHours: number;
  projection: number;
  enjoyment: number;
};

/**
 * 30 wears across 7 fragrances. Comfortably past the cold-start thresholds
 * (10 wears / 5 distinct fragrances / at least one rated), so the advisor
 * exercises its scored path rather than its cold-start path, and insights has
 * enough history for seasonal and preferred-accord output.
 *
 * Weather values are Manila-plausible: hot and humid year round, with the
 * cooler dry months showing up in the older entries.
 */
// One wear per line reads as a table; exploded objects do not.
// prettier-ignore
const WEARS: SeedWear[] = [
  // --- Recent: hot, humid, fresh-leaning ---
  { key: "hawas/hawas-ice", days: 1, sprays: 6, occasion: Occasion.WORK, environment: Environment.MIXED, temperatureC: 32, humidityPct: 78, weatherCondition: "Partly cloudy", longevityHours: 6, projection: 3, enjoyment: 4 },
  { key: "creed/aventus", days: 3, sprays: 4, occasion: Occasion.DATE, environment: Environment.INDOOR, temperatureC: 30, humidityPct: 74, weatherCondition: "Clear", longevityHours: 8, projection: 4, enjoyment: 5 },
  { key: "hawas/hawas-ice", days: 5, sprays: 6, occasion: Occasion.CASUAL, environment: Environment.OUTDOOR, temperatureC: 33, humidityPct: 81, weatherCondition: "Clear", longevityHours: 5, projection: 3, enjoyment: 4 },
  { key: "chanel/bleu-de-chanel", days: 7, sprays: 5, occasion: Occasion.WORK, environment: Environment.INDOOR, temperatureC: 29, humidityPct: 72, weatherCondition: "Overcast", longevityHours: 7, projection: 3, enjoyment: 4 },
  { key: "hawas/hawas-ice", days: 9, sprays: 5, occasion: Occasion.SPORT, environment: Environment.OUTDOOR, temperatureC: 31, humidityPct: 83, weatherCondition: "Light rain", longevityHours: 4, projection: 2, enjoyment: 3 },
  { key: "maison-francis-kurkdjian/baccarat-rouge-540", days: 11, sprays: 3, occasion: Occasion.EVENING, environment: Environment.INDOOR, temperatureC: 28, humidityPct: 70, weatherCondition: "Clear", longevityHours: 10, projection: 5, enjoyment: 5 },
  { key: "creed/aventus", days: 13, sprays: 4, occasion: Occasion.WORK, environment: Environment.MIXED, temperatureC: 30, humidityPct: 76, weatherCondition: "Partly cloudy", longevityHours: 7.5, projection: 4, enjoyment: 5 },
  { key: "hawas/hawas-ice", days: 16, sprays: 6, occasion: Occasion.CASUAL, environment: Environment.OUTDOOR, temperatureC: 34, humidityPct: 79, weatherCondition: "Clear", longevityHours: 5, projection: 3, enjoyment: 4 },
  { key: "chanel/bleu-de-chanel", days: 18, sprays: 5, occasion: Occasion.FORMAL, environment: Environment.INDOOR, temperatureC: 27, humidityPct: 68, weatherCondition: "Overcast", longevityHours: 8, projection: 3, enjoyment: 4 },
  { key: "parfums-de-marly/layton", days: 21, sprays: 3, occasion: Occasion.EVENING, environment: Environment.INDOOR, temperatureC: 28, humidityPct: 71, weatherCondition: "Clear", longevityHours: 11, projection: 5, enjoyment: 5 },

  // --- Mid window ---
  { key: "creed/aventus", days: 24, sprays: 4, occasion: Occasion.DATE, environment: Environment.MIXED, temperatureC: 29, humidityPct: 73, weatherCondition: "Clear", longevityHours: 8, projection: 4, enjoyment: 5 },
  { key: "dior/sauvage", days: 27, sprays: 6, occasion: Occasion.CASUAL, environment: Environment.OUTDOOR, temperatureC: 32, humidityPct: 77, weatherCondition: "Partly cloudy", longevityHours: 6, projection: 4, enjoyment: 3 },
  { key: "maison-francis-kurkdjian/baccarat-rouge-540", days: 30, sprays: 3, occasion: Occasion.DATE, environment: Environment.INDOOR, temperatureC: 28, humidityPct: 69, weatherCondition: "Clear", longevityHours: 12, projection: 5, enjoyment: 5 },
  { key: "parfums-de-marly/layton", days: 34, sprays: 4, occasion: Occasion.WORK, environment: Environment.INDOOR, temperatureC: 27, humidityPct: 70, weatherCondition: "Overcast", longevityHours: 10, projection: 4, enjoyment: 5 },
  { key: "chanel/bleu-de-chanel", days: 38, sprays: 5, occasion: Occasion.WORK, environment: Environment.INDOOR, temperatureC: 28, humidityPct: 72, weatherCondition: "Light rain", longevityHours: 7, projection: 3, enjoyment: 4 },
  { key: "creed/aventus", days: 41, sprays: 4, occasion: Occasion.FORMAL, environment: Environment.INDOOR, temperatureC: 26, humidityPct: 66, weatherCondition: "Clear", longevityHours: 9, projection: 4, enjoyment: 5 },
  { key: "dior/sauvage", days: 45, sprays: 6, occasion: Occasion.SPORT, environment: Environment.OUTDOOR, temperatureC: 31, humidityPct: 80, weatherCondition: "Clear", longevityHours: 5.5, projection: 3, enjoyment: 3 },
  { key: "parfums-de-marly/layton", days: 49, sprays: 3, occasion: Occasion.EVENING, environment: Environment.MIXED, temperatureC: 25, humidityPct: 64, weatherCondition: "Partly cloudy", longevityHours: 11, projection: 5, enjoyment: 5 },
  { key: "maison-francis-kurkdjian/baccarat-rouge-540", days: 53, sprays: 2, occasion: Occasion.EVENING, environment: Environment.INDOOR, temperatureC: 26, humidityPct: 67, weatherCondition: "Clear", longevityHours: 12, projection: 5, enjoyment: 4 },
  { key: "chanel/bleu-de-chanel", days: 58, sprays: 5, occasion: Occasion.WORK, environment: Environment.INDOOR, temperatureC: 27, humidityPct: 70, weatherCondition: "Overcast", longevityHours: 7, projection: 3, enjoyment: 4 },

  // --- Older: cooler, drier months ---
  { key: "creed/aventus", days: 64, sprays: 4, occasion: Occasion.WORK, environment: Environment.MIXED, temperatureC: 24, humidityPct: 60, weatherCondition: "Clear", longevityHours: 9, projection: 4, enjoyment: 5 },
  { key: "parfums-de-marly/layton", days: 70, sprays: 4, occasion: Occasion.FORMAL, environment: Environment.INDOOR, temperatureC: 23, humidityPct: 58, weatherCondition: "Clear", longevityHours: 12, projection: 5, enjoyment: 5 },
  { key: "dior/sauvage", days: 76, sprays: 5, occasion: Occasion.CASUAL, environment: Environment.OUTDOOR, temperatureC: 25, humidityPct: 62, weatherCondition: "Partly cloudy", longevityHours: 6, projection: 3, enjoyment: 3 },
  { key: "parfums-de-marly/layton", days: 82, sprays: 3, occasion: Occasion.DATE, environment: Environment.INDOOR, temperatureC: 22, humidityPct: 57, weatherCondition: "Clear", longevityHours: 12, projection: 5, enjoyment: 5 },
  { key: "chanel/bleu-de-chanel", days: 88, sprays: 5, occasion: Occasion.WORK, environment: Environment.INDOOR, temperatureC: 24, humidityPct: 61, weatherCondition: "Overcast", longevityHours: 8, projection: 3, enjoyment: 4 },

  // Tobacco Vanille stops here — this is what makes it read as neglected.
  { key: "tom-ford/tobacco-vanille", days: 96, sprays: 2, occasion: Occasion.EVENING, environment: Environment.INDOOR, temperatureC: 21, humidityPct: 55, weatherCondition: "Clear", longevityHours: 14, projection: 5, enjoyment: 3 },
  { key: "tom-ford/tobacco-vanille", days: 104, sprays: 2, occasion: Occasion.FORMAL, environment: Environment.INDOOR, temperatureC: 22, humidityPct: 56, weatherCondition: "Clear", longevityHours: 13, projection: 4, enjoyment: 3 },
  { key: "creed/aventus", days: 112, sprays: 4, occasion: Occasion.DATE, environment: Environment.MIXED, temperatureC: 23, humidityPct: 59, weatherCondition: "Partly cloudy", longevityHours: 9, projection: 4, enjoyment: 4 },
  { key: "dior/sauvage", days: 125, sprays: 6, occasion: Occasion.CASUAL, environment: Environment.OUTDOOR, temperatureC: 26, humidityPct: 63, weatherCondition: "Clear", longevityHours: 6, projection: 4, enjoyment: 3 },
  { key: "maison-francis-kurkdjian/baccarat-rouge-540", days: 138, sprays: 3, occasion: Occasion.EVENING, environment: Environment.INDOOR, temperatureC: 24, humidityPct: 60, weatherCondition: "Overcast", longevityHours: 11, projection: 5, enjoyment: 4 },
];

/** Resolves "<brand slug>/<fragrance slug>" to a fragrance id. */
async function fragranceIdsByKey(): Promise<Map<string, string>> {
  const rows = await prisma.fragrance.findMany({
    select: { id: true, slug: true, brand: { select: { slug: true } } },
  });
  return new Map(rows.map((r) => [`${r.brand.slug}/${r.slug}`, r.id]));
}

async function seedDevUser() {
  const passwordHash = await bcrypt.hash(DEV_USER.password, BCRYPT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email: DEV_USER.email },
    update: { passwordHash, name: DEV_USER.name, timezone: DEV_USER.timezone },
    create: {
      email: DEV_USER.email,
      name: DEV_USER.name,
      passwordHash,
      timezone: DEV_USER.timezone,
      defaultCurrency: DEV_USER.currency,
    },
    select: { id: true },
  });

  // This account exists only to be seeded, so its rows are rebuilt on every run
  // — that is what keeps the relative dates (and therefore the "neglected" and
  // seasonal insights) meaningful. Scoped to this user id; nothing else in the
  // database is touched.
  await prisma.wearLog.deleteMany({ where: { userId: user.id } });
  await prisma.collectionItem.deleteMany({ where: { userId: user.id } });

  const idsByKey = await fragranceIdsByKey();
  const missing = [...COLLECTION.map((c) => c.key), ...WEARS.map((w) => w.key)].filter(
    (k) => !idsByKey.has(k),
  );
  if (missing.length > 0) {
    throw new Error(`Seed keys not found in the catalogue: ${[...new Set(missing)].join(", ")}`);
  }

  const collectionItemIdByKey = new Map<string, string>();
  for (const c of COLLECTION) {
    const fragranceId = idsByKey.get(c.key)!;
    const owned = daysAgo(c.ownedForDays);
    const item = await prisma.collectionItem.create({
      data: {
        userId: user.id,
        fragranceId,
        bottleSizeMl: c.bottleSizeMl,
        remainingMl: c.remainingMl,
        purchasePriceMinor: c.priceMinor,
        currency: DEV_USER.currency,
        purchaseDate: owned,
        purchaseSource: "Seeded",
        condition: c.condition,
        personalRating: c.personalRating,
        personalNotes: c.personalNotes,
        // Explicit so "owned for at least 90 days" is exercised — the column
        // otherwise defaults to now() and nothing would ever read as neglected.
        createdAt: owned,
      },
      select: { id: true },
    });
    collectionItemIdByKey.set(c.key, item.id);
  }

  await prisma.wearLog.createMany({
    data: WEARS.map((w) => ({
      userId: user.id,
      fragranceId: idsByKey.get(w.key)!,
      collectionItemId: collectionItemIdByKey.get(w.key) ?? null,
      wornAt: daysAgo(w.days),
      sprays: w.sprays,
      occasion: w.occasion,
      environment: w.environment,
      temperatureC: w.temperatureC,
      humidityPct: w.humidityPct,
      weatherCondition: w.weatherCondition,
      weatherSource: WeatherSource.MANUAL,
      longevityHours: w.longevityHours,
      projection: w.projection,
      enjoyment: w.enjoyment,
      createdAt: daysAgo(w.days),
    })),
  });

  return { collection: COLLECTION.length, wears: WEARS.length };
}

async function main() {
  for (const f of FRAGRANCES) {
    await seedFragrance(f);
  }
  const count = await prisma.fragrance.count();
  console.log(`Catalogue seeded. Canonical fragrances in DB: ${count}`);

  const skipDevUser = process.env.NODE_ENV === "production" && process.env.SEED_DEV_USER !== "true";
  if (skipDevUser) {
    console.log("NODE_ENV=production — skipping the dev account. Set SEED_DEV_USER=true to force.");
    return;
  }

  const { collection, wears } = await seedDevUser();
  console.log(
    `Dev account seeded: ${DEV_USER.email} / ${DEV_USER.password} ` +
      `(${collection} bottles, ${wears} wears).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
