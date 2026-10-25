import { z } from "zod";

/**
 * Words that would collide with routes or read as official. Checked after
 * normalisation, so "Admin" and "ADMIN" are caught too.
 */
const RESERVED = new Set([
  "admin",
  "administrator",
  "root",
  "system",
  "support",
  "help",
  "moderator",
  "mod",
  "staff",
  "official",
  "fragavenue",
  "frag",
  "me",
  "you",
  "null",
  "undefined",
  "anonymous",
  "api",
  "app",
  "u",
  "feed",
  "wardrobe",
  "log",
  "wears",
  "stats",
  "clubs",
  "profile",
  "settings",
  "people",
  "fragrances",
  "catalogue",
  "signin",
  "signup",
  "login",
  "logout",
]);

/**
 * Public handle: 3–20 characters, lowercase letters, digits, and underscores,
 * starting with a letter. Input is trimmed, lowercased, and a leading "@" is
 * dropped, so the stored value is canonical and the unique index is
 * effectively case-insensitive.
 */
export const Username = z
  .string({ required_error: "Choose a username." })
  .trim()
  .transform((v) => v.replace(/^@/, "").toLowerCase())
  .pipe(
    z
      .string()
      .min(3, "At least 3 characters.")
      .max(20, "20 characters at most.")
      .regex(/^[a-z][a-z0-9_]*$/, "Use letters, numbers, and _, starting with a letter.")
      .refine((v) => !RESERVED.has(v), "That username is reserved."),
  );
