import { z } from "zod";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

/**
 * Parses raw URLSearchParams-style input into a normalized list query.
 * Unknown / malformed values collapse to defaults rather than throwing —
 * this powers a search page, not a form submission.
 */
export const FragranceListInput = z.object({
  q: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .catch(DEFAULT_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});
export type FragranceListInput = z.infer<typeof FragranceListInput>;
