import { z } from "zod";

const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema);

/**
 * Form-shaped input from an HTML form. Strings coerce to numbers/dates, empty
 * strings collapse to `undefined`. Currency is trimmed and upper-cased. The
 * business rule "currency required when price is set" is enforced by the
 * superRefine — do NOT rely on the DB for it (schema allows either both or
 * neither).
 */
export const CollectionItemFormInput = z
  .object({
    fragranceId: z.string().trim().min(1, "Fragrance is required."),
    bottleSizeMl: z.coerce
      .number({ invalid_type_error: "Bottle size must be a number." })
      .int("Whole millilitres only.")
      .min(1, "Bottle size must be at least 1 ml.")
      .max(2000, "Bottle size looks too large."),
    remainingMl: emptyToUndef(
      z.coerce.number().int().min(0, "Cannot be negative.").max(2000).optional(),
    ),
    priceDecimal: emptyToUndef(
      z
        .string()
        .trim()
        .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount, e.g. 150 or 150.00")
        .optional(),
    ),
    currency: emptyToUndef(
      z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{3}$/, "Use a 3-letter ISO code, e.g. USD.")
        .optional(),
    ),
    purchaseDate: emptyToUndef(z.coerce.date().optional()),
    purchaseSource: emptyToUndef(z.string().trim().max(200).optional()),
    batchCode: emptyToUndef(z.string().trim().max(50).optional()),
    condition: z.enum(["NEW", "USED", "DECANT"]).default("NEW"),
    personalRating: emptyToUndef(
      z.coerce.number().int().min(1, "1–5 only.").max(5, "1–5 only.").optional(),
    ),
    personalNotes: emptyToUndef(z.string().trim().max(2000).optional()),
  })
  .superRefine((val, ctx) => {
    if (val.priceDecimal !== undefined && !val.currency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Currency is required when a price is set.",
        path: ["currency"],
      });
    }
    if (
      val.remainingMl !== undefined &&
      val.bottleSizeMl !== undefined &&
      val.remainingMl > val.bottleSizeMl
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Remaining can't exceed bottle size.",
        path: ["remainingMl"],
      });
    }
  });

export type CollectionItemFormInput = z.infer<typeof CollectionItemFormInput>;

/**
 * Converts a validated form input to the shape Prisma expects. Price string
 * becomes integer minor units. Optional fields become explicit `null` for
 * updates (so blanking a field actually clears it in the DB).
 */
export function toPersistenceInput(input: CollectionItemFormInput) {
  const priceMinor =
    input.priceDecimal !== undefined ? decimalStringToMinor(input.priceDecimal) : null;
  return {
    fragranceId: input.fragranceId,
    bottleSizeMl: input.bottleSizeMl,
    remainingMl: input.remainingMl ?? null,
    purchasePriceMinor: priceMinor,
    currency: priceMinor !== null ? (input.currency ?? null) : null,
    purchaseDate: input.purchaseDate ?? null,
    purchaseSource: input.purchaseSource ?? null,
    batchCode: input.batchCode ?? null,
    condition: input.condition,
    personalRating: input.personalRating ?? null,
    personalNotes: input.personalNotes ?? null,
  };
}

export function decimalStringToMinor(s: string): number {
  const [wholeRaw, fracRaw = ""] = s.split(".");
  const whole = wholeRaw ?? "0";
  const frac = (fracRaw + "00").slice(0, 2);
  return Number(whole) * 100 + Number(frac);
}

export function minorToDecimalString(minor: number): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${frac}`;
}
