import {
  MOOD_LABEL,
  OCCASION_LABEL,
  checkInSummary,
  type Mood,
  type RecordedCheckIn,
} from "@/modules/wear-logs";
import { formatTemperature, type UnitSystem } from "@/lib/units";
import { slugify } from "@/lib/slug";

/**
 * What a share image shows, as plain strings: built on the server from a wear
 * and handed to the client, which draws it (render-share-card.ts). Pure.
 */
export type ShareCardData = {
  house: string;
  name: string;
  imagePath: string | null;
  /** "Saturday, Oct 24 · 8:00 AM", in the zone the wear was logged in. */
  when: string;
  stats: Array<{ label: string; value: string }>;
  /** Check-in summary, e.g. "Strong 2h · Faint 4h". */
  summary: string | null;
  /** "@dev", or null for an account without a username. */
  handle: string | null;
  /** File name without extension, e.g. "frag-avenue-rasasi-hawas-ice". */
  fileName: string;
};

export const SHARE_FORMATS = {
  story: { label: "Story", width: 1080, height: 1920, hint: "Instagram, then Story" },
  post: { label: "Post", width: 1080, height: 1350, hint: "Instagram, then Feed (or any app)" },
} as const;
export type ShareFormat = keyof typeof SHARE_FORMATS;

/** The fields of a wear the card needs; a feed card's data has them all. */
export type ShareWearInput = {
  wornAt: Date;
  timeZone: string;
  sprays: number;
  occasion: string;
  mood: Mood | null;
  temperatureC: number | null;
  fragrance: { name: string; imagePath: string | null; brand: { name: string } };
  user: { username: string | null };
  checkIns: RecordedCheckIn[];
};

/** "Saturday, Oct 24 · 8:00 AM" in `timeZone`. */
export function formatShareWhen(instant: Date, timeZone: string, locale = "en-US"): string {
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(instant);
  const date = part({ weekday: "long", month: "short", day: "numeric" });
  const time = part({ hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

export function buildShareCard(wear: ShareWearInput, units: UnitSystem): ShareCardData {
  const stats: ShareCardData["stats"] = [
    { label: "Sprays", value: String(wear.sprays) },
    {
      label: "Occasion",
      value: OCCASION_LABEL[wear.occasion as keyof typeof OCCASION_LABEL] ?? wear.occasion,
    },
  ];
  if (wear.mood) stats.push({ label: "Mood", value: MOOD_LABEL[wear.mood] });
  if (wear.temperatureC !== null) {
    stats.push({ label: "Temp", value: formatTemperature(wear.temperatureC, units) });
  }
  const house = wear.fragrance.brand.name;
  const name = wear.fragrance.name;
  return {
    house,
    name,
    imagePath: wear.fragrance.imagePath,
    when: formatShareWhen(wear.wornAt, wear.timeZone),
    stats,
    summary: checkInSummary(wear.checkIns),
    handle: wear.user.username ? `@${wear.user.username}` : null,
    fileName: `frag-avenue-${slugify(house)}-${slugify(name)}`,
  };
}
