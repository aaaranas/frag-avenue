/**
 * Idempotent development seed. Safe to re-run.
 *
 * Two parts:
 *   1. The catalogue — prisma/data/catalogue.csv and the Wikidata snapshot, via
 *      `applyCatalogue` (prisma/catalogue.ts), the same step the Vercel build
 *      runs against production.
 *   2. A deterministic development account (see DEV_USER) with a collection and
 *      wear history, so a fresh clone is usable immediately and the Playwright
 *      suite has a fixed account to sign in as.
 *
 * Part 2 is skipped in production unless SEED_DEV_USER=true.
 */
import {
  PrismaClient,
  BottleCondition,
  Environment,
  ItemKind,
  Occasion,
  WeatherSource,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, localDate, zonedWallTimeToUtc } from "../src/lib/time-zone";
import { applyCatalogue, describeSummary } from "./catalogue";

const prisma = new PrismaClient();

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
  username: "dev",
  timezone: "Asia/Manila",
  currency: "PHP",
} as const;

/** A second local account, so the feed, follows, kudos, and comments have someone to show. */
export const FRIEND_USER = {
  email: "mika@frag.test",
  password: "devpassword123",
  name: "Mika",
  username: "mika",
  timezone: "Asia/Manila",
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
  kind?: ItemKind; // default BOTTLE
  bottleSizeMl: number | null;
  remainingMl: number | null;
  priceMinor: number | null; // PHP centavos
  ownedForDays: number;
  condition?: BottleCondition;
  personalRating?: number;
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
    key: "rasasi/hawas-ice",
    bottleSizeMl: 100,
    remainingMl: 88,
    priceMinor: 385_000,
    ownedForDays: 40,
    condition: BottleCondition.NEW,
    personalRating: 4,
    personalNotes: "Absurd value. The hot-weather default now.",
  },
  // One of each other kind, so the Wardrobe filters have something to show.
  // Listed after the bottles: wears attach to the first item per fragrance.
  {
    key: "creed/aventus",
    kind: ItemKind.DECANT,
    bottleSizeMl: 10,
    remainingMl: 6,
    priceMinor: 120_000,
    ownedForDays: 20,
    personalNotes: "Travel decant.",
  },
  {
    key: "parfums-de-marly/layton",
    kind: ItemKind.SAMPLE,
    bottleSizeMl: 2,
    remainingMl: 1,
    priceMinor: null,
    ownedForDays: 10,
  },
  {
    key: "chanel/bleu-de-chanel",
    kind: ItemKind.WISHLIST,
    bottleSizeMl: 150,
    remainingMl: null,
    priceMinor: 1_150_000,
    ownedForDays: 5,
    personalNotes: "The big bottle, eventually.",
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
  { key: "rasasi/hawas-ice", days: 1, sprays: 6, occasion: Occasion.WORK, environment: Environment.MIXED, temperatureC: 32, humidityPct: 78, weatherCondition: "Partly cloudy", longevityHours: 6, projection: 3, enjoyment: 4 },
  { key: "creed/aventus", days: 3, sprays: 4, occasion: Occasion.DATE, environment: Environment.INDOOR, temperatureC: 30, humidityPct: 74, weatherCondition: "Clear", longevityHours: 8, projection: 4, enjoyment: 5 },
  { key: "rasasi/hawas-ice", days: 5, sprays: 6, occasion: Occasion.CASUAL, environment: Environment.OUTDOOR, temperatureC: 33, humidityPct: 81, weatherCondition: "Clear", longevityHours: 5, projection: 3, enjoyment: 4 },
  { key: "chanel/bleu-de-chanel", days: 7, sprays: 5, occasion: Occasion.WORK, environment: Environment.INDOOR, temperatureC: 29, humidityPct: 72, weatherCondition: "Overcast", longevityHours: 7, projection: 3, enjoyment: 4 },
  { key: "rasasi/hawas-ice", days: 9, sprays: 5, occasion: Occasion.SPORT, environment: Environment.OUTDOOR, temperatureC: 31, humidityPct: 83, weatherCondition: "Light rain", longevityHours: 4, projection: 2, enjoyment: 3 },
  { key: "maison-francis-kurkdjian/baccarat-rouge-540", days: 11, sprays: 3, occasion: Occasion.EVENING, environment: Environment.INDOOR, temperatureC: 28, humidityPct: 70, weatherCondition: "Clear", longevityHours: 10, projection: 5, enjoyment: 5 },
  { key: "creed/aventus", days: 13, sprays: 4, occasion: Occasion.WORK, environment: Environment.MIXED, temperatureC: 30, humidityPct: 76, weatherCondition: "Partly cloudy", longevityHours: 7.5, projection: 4, enjoyment: 5 },
  { key: "rasasi/hawas-ice", days: 16, sprays: 6, occasion: Occasion.CASUAL, environment: Environment.OUTDOOR, temperatureC: 34, humidityPct: 79, weatherCondition: "Clear", longevityHours: 5, projection: 3, enjoyment: 4 },
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

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "db", "postgres"]);

/** The database host, for log messages. Never includes credentials. */
function describeTarget(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) return "an unknown host";
  try {
    const url = new URL(raw);
    return `${url.hostname}:${url.port || "5432"}`;
  } catch {
    return "an unparseable DATABASE_URL";
  }
}

/**
 * Whether it is safe to create the development account.
 *
 * Gated on the database being *pointed at*, not on NODE_ENV. NODE_ENV describes
 * the process, and the dangerous case is precisely the one where they disagree:
 * running this script from a laptop (NODE_ENV unset) against a production
 * DATABASE_URL. That would put an account whose password is published in the
 * README into production. Anything not obviously local is refused unless the
 * caller opts in explicitly.
 */
function shouldSeedDevUser(): boolean {
  if (process.env.SEED_DEV_USER === "true") return true;

  const raw = process.env.DATABASE_URL;
  if (!raw) return false;
  try {
    return LOCAL_HOSTS.has(new URL(raw).hostname);
  } catch {
    // Cannot tell what we are pointed at, so assume the worst.
    return false;
  }
}

async function seedDevUser() {
  const passwordHash = await bcrypt.hash(DEV_USER.password, BCRYPT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email: DEV_USER.email },
    update: {
      passwordHash,
      name: DEV_USER.name,
      username: DEV_USER.username,
      timezone: DEV_USER.timezone,
    },
    create: {
      email: DEV_USER.email,
      name: DEV_USER.name,
      username: DEV_USER.username,
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
  await prisma.wear.deleteMany({ where: { userId: user.id } });
  await prisma.wardrobeItem.deleteMany({ where: { userId: user.id } });

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
    const item = await prisma.wardrobeItem.create({
      data: {
        userId: user.id,
        fragranceId,
        kind: c.kind ?? ItemKind.BOTTLE,
        bottleSizeMl: c.bottleSizeMl,
        remainingMl: c.remainingMl,
        purchasePriceMinor: c.priceMinor,
        currency: c.priceMinor !== null ? DEV_USER.currency : null,
        purchaseDate: c.kind === ItemKind.WISHLIST ? null : owned,
        purchaseSource: "Seeded",
        condition:
          c.condition ??
          (c.kind === ItemKind.DECANT ? BottleCondition.DECANT : BottleCondition.NEW),
        personalRating: c.personalRating,
        personalNotes: c.personalNotes,
        // Explicit so "owned for at least 90 days" is exercised — the column
        // otherwise defaults to now() and nothing would ever read as neglected.
        createdAt: owned,
      },
      select: { id: true },
    });
    if (!collectionItemIdByKey.has(c.key)) collectionItemIdByKey.set(c.key, item.id);
  }

  await prisma.wear.createMany({
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
      // Shared with followers, so the friend account's feed has something in it.
      visibility: "FOLLOWERS",
      createdAt: daysAgo(w.days),
    })),
  });

  await seedFriend(user.id, idsByKey, passwordHash);
  return { collection: COLLECTION.length, wears: WEARS.length };
}

/**
 * The friend account: three wears (one public, one for followers, one private),
 * mutual follows with the dev account, and a little kudos and conversation.
 * Rebuilt every run, like the dev account; touches only these two accounts.
 */
async function seedFriend(devUserId: string, idsByKey: Map<string, string>, passwordHash: string) {
  const friend = await prisma.user.upsert({
    where: { email: FRIEND_USER.email },
    update: { passwordHash, name: FRIEND_USER.name, username: FRIEND_USER.username },
    create: {
      email: FRIEND_USER.email,
      name: FRIEND_USER.name,
      username: FRIEND_USER.username,
      passwordHash,
      timezone: FRIEND_USER.timezone,
    },
    select: { id: true },
  });
  const both = [devUserId, friend.id];
  await prisma.follow.deleteMany({
    where: { OR: [{ followerId: { in: both } }, { followeeId: { in: both } }] },
  });
  await prisma.wear.deleteMany({ where: { userId: friend.id } });
  await prisma.wardrobeItem.deleteMany({ where: { userId: friend.id } });

  const item = async (key: string, sizeMl: number) =>
    prisma.wardrobeItem.create({
      data: {
        userId: friend.id,
        fragranceId: idsByKey.get(key)!,
        bottleSizeMl: sizeMl,
        remainingMl: sizeMl,
      },
      select: { id: true, fragranceId: true },
    });
  const layton = await item("parfums-de-marly/layton", 125);
  const br540 = await item("maison-francis-kurkdjian/baccarat-rouge-540", 70);

  const wear = (
    it: { id: string; fragranceId: string },
    days: number,
    visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE",
    extra: { occasion: Occasion; sprays: number; notes?: string },
  ) =>
    prisma.wear.create({
      data: {
        userId: friend.id,
        fragranceId: it.fragranceId,
        collectionItemId: it.id,
        // 7 PM in the friend's own zone, whatever zone the seed runs in.
        wornAt: zonedWallTimeToUtc(
          `${addDays(localDate(new Date(), FRIEND_USER.timezone), -days)}T19:00`,
          FRIEND_USER.timezone,
        ),
        timeZone: FRIEND_USER.timezone,
        visibility,
        temperatureC: 29,
        humidityPct: 80,
        weatherCondition: "clouds",
        weatherSource: WeatherSource.MANUAL,
        ...extra,
      },
      select: { id: true },
    });
  const publicWear = await wear(layton, 1, "PUBLIC", {
    occasion: Occasion.DATE,
    sprays: 3,
    notes: "Dinner out.",
  });
  await wear(br540, 2, "FOLLOWERS", { occasion: Occasion.WORK, sprays: 2 });
  await wear(layton, 3, "PRIVATE", { occasion: Occasion.CASUAL, sprays: 4 });

  await prisma.follow.createMany({
    data: [
      { followerId: devUserId, followeeId: friend.id },
      { followerId: friend.id, followeeId: devUserId },
    ],
  });

  const devLatest = await prisma.wear.findFirst({
    where: { userId: devUserId },
    orderBy: { wornAt: "desc" },
    select: { id: true },
  });
  await prisma.kudos.createMany({
    data: [
      { wearId: publicWear.id, userId: devUserId },
      ...(devLatest ? [{ wearId: devLatest.id, userId: friend.id }] : []),
    ],
  });
  if (devLatest) {
    await prisma.comment.create({
      data: { wearId: devLatest.id, userId: friend.id, body: "Perfect weather for it." },
    });
  }

  // A club with both accounts, so the leaderboards have someone on them.
  const club = await prisma.club.upsert({
    where: { slug: "manila-fragheads" },
    update: {},
    create: {
      slug: "manila-fragheads",
      name: "Manila Fragheads",
      description: "Hot, humid, and still spraying. Local wears and weekend meetups.",
      createdById: devUserId,
    },
    select: { id: true },
  });
  await prisma.clubMembership.deleteMany({ where: { clubId: club.id, userId: { in: both } } });
  await prisma.clubMembership.createMany({
    data: [
      { clubId: club.id, userId: devUserId, role: "ADMIN" },
      { clubId: club.id, userId: friend.id, role: "MEMBER" },
    ],
  });
}

async function main() {
  console.log(describeSummary(await applyCatalogue(prisma)));
  const count = await prisma.fragrance.count();
  console.log(`Catalogue seeded. Canonical fragrances in DB: ${count}`);

  if (!shouldSeedDevUser()) {
    console.log(
      `Database at ${describeTarget()} is not local — skipping the dev account.\n` +
        "Set SEED_DEV_USER=true to create it there anyway.",
    );
    return;
  }

  const { collection, wears } = await seedDevUser();
  console.log(
    `Dev account seeded: ${DEV_USER.email} / ${DEV_USER.password} ` +
      `(${collection} wardrobe items, ${wears} wears).\n` +
      `Friend account seeded: ${FRIEND_USER.email} / ${FRIEND_USER.password} (@${FRIEND_USER.username}).`,
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
