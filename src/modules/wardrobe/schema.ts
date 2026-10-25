import { z } from "zod";

export const ITEM_KINDS = ["BOTTLE", "DECANT", "SAMPLE", "WISHLIST"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const KIND_LABEL: Record<ItemKind, string> = {
  BOTTLE: "Bottle",
  DECANT: "Decant",
  SAMPLE: "Sample",
  WISHLIST: "Wishlist",
};

/** Filter tab labels (plural), in display order. */
export const KIND_FILTER_LABEL: Record<ItemKind, string> = {
  BOTTLE: "Bottles",
  DECANT: "Decants",
  SAMPLE: "Samples",
  WISHLIST: "Wishlist",
};

/** `?type=` on /wardrobe. Anything unrecognised means "all". */
export const WardrobeFilter = z
  .enum(["bottle", "decant", "sample", "wishlist"])
  .optional()
  .catch(undefined)
  .transform((v) => (v ? (v.toUpperCase() as ItemKind) : undefined));

const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema);

/**
 * Add/edit form. Rules beyond field shapes:
 *  - a size is required for owned kinds (bottle, decant, sample), optional for wishlist;
 *  - remaining can't exceed size;
 *  - a price needs a currency.
 * Wishlist entries have no fill level or purchase date; `toPersistenceInput`
 * clears them so switching an item to wishlist leaves no stale values.
 */
export const WardrobeItemFormInput = z
  .object({
    fragranceId: z.string().trim().min(1, "Fragrance is required."),
    kind: z.enum(ITEM_KINDS, { errorMap: () => ({ message: "Choose a type." }) }).default("BOTTLE"),
    bottleSizeMl: emptyToUndef(
      z.coerce
        .number({ invalid_type_error: "Size must be a number." })
        .int("Whole millilitres only.")
        .min(1, "Size must be at least 1 ml.")
        .max(2000, "Size looks too large.")
        .optional(),
    ),
    remainingMl: emptyToUndef(
      z.coerce
        .number({ invalid_type_error: "Remaining must be a number." })
        .int("Whole millilitres only.")
        .min(0, "Cannot be negative.")
        .max(2000)
        .optional(),
    ),
    priceDecimal: emptyToUndef(
      z
        .string()
        .trim()
        .regex(/^\d{1,9}(\.\d{1,2})?$/, "Enter an amount, e.g. 3500 or 3500.00")
        .optional(),
    ),
    currency: emptyToUndef(
      z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{3}$/, "Use a 3-letter code, e.g. PHP.")
        .optional(),
    ),
    purchaseDate: emptyToUndef(
      z.coerce.date({ invalid_type_error: "Enter a valid date." }).optional(),
    ),
    personalNotes: emptyToUndef(z.string().trim().max(2000).optional()),
  })
  .superRefine((val, ctx) => {
    if (val.kind !== "WISHLIST" && val.bottleSizeMl === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter the size in ml.",
        path: ["bottleSizeMl"],
      });
    }
    if (
      val.kind !== "WISHLIST" &&
      val.remainingMl !== undefined &&
      val.bottleSizeMl !== undefined &&
      val.remainingMl > val.bottleSizeMl
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Remaining can't be more than the size.",
        path: ["remainingMl"],
      });
    }
    if (val.priceDecimal !== undefined && !val.currency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add a currency for the price.",
        path: ["currency"],
      });
    }
  });

export type WardrobeItemFormInput = z.infer<typeof WardrobeItemFormInput>;

/**
 * The columns the wardrobe form owns. Legacy columns (condition, rating, batch
 * code, purchase source) are deliberately absent so an edit never clears them.
 */
export function toPersistenceInput(input: WardrobeItemFormInput) {
  const wishlist = input.kind === "WISHLIST";
  const priceMinor =
    input.priceDecimal !== undefined ? decimalStringToMinor(input.priceDecimal) : null;
  return {
    fragranceId: input.fragranceId,
    kind: input.kind,
    bottleSizeMl: input.bottleSizeMl ?? null,
    remainingMl: wishlist ? null : (input.remainingMl ?? null),
    purchasePriceMinor: priceMinor,
    currency: priceMinor !== null ? (input.currency ?? null) : null,
    purchaseDate: wishlist ? null : (input.purchaseDate ?? null),
    personalNotes: input.personalNotes ?? null,
  };
}

export type WardrobePersistenceInput = ReturnType<typeof toPersistenceInput>;

export function decimalStringToMinor(s: string): number {
  const [wholeRaw, fracRaw = ""] = s.split(".");
  const frac = (fracRaw + "00").slice(0, 2);
  return Number(wholeRaw ?? "0") * 100 + Number(frac);
}

export function minorToDecimalString(minor: number): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
