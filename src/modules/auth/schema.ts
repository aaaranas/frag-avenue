import { z } from "zod";
import { isValidTimeZone } from "@/lib/time-zone";
import { Username } from "@/lib/username";

export const SignInInput = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
export type SignInInput = z.infer<typeof SignInInput>;

export const SignUpInput = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(80, "Name is too long.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  password: z.string().min(8, "Use at least 8 characters.").max(200, "Password is too long."),
  username: Username,
  /**
   * The browser's IANA zone, filled in client-side. Missing or unrecognised
   * falls back to UTC rather than failing sign-up; the user can change it later.
   */
  timezone: z
    .unknown()
    .transform((v) => (typeof v === "string" && isValidTimeZone(v.trim()) ? v.trim() : "UTC")),
});
export type SignUpInput = z.infer<typeof SignUpInput>;
