import { z } from "zod";

export const CONCENTRATIONS = [
  "EXTRAIT",
  "PARFUM",
  "EDP",
  "EDT",
  "EDC",
  "COLOGNE",
  "OTHER",
] as const;

export const CONCENTRATION_LABEL: Record<(typeof CONCENTRATIONS)[number], string> = {
  EXTRAIT: "Extrait",
  PARFUM: "Parfum",
  EDP: "Eau de Parfum",
  EDT: "Eau de Toilette",
  EDC: "Eau de Cologne",
  COLOGNE: "Cologne",
  OTHER: "Other",
};

const name = (label: string, max: number) =>
  z
    .string({ required_error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} is too long.`)
    // At least one letter or digit, so the slug is never empty.
    .refine((v) => /[\p{L}\p{N}]/u.test(v), `${label} needs a letter or number.`);

export const SubmitFragranceInput = z.object({
  brand: name("House", 80),
  name: name("Name", 120),
  concentration: z.enum(CONCENTRATIONS, {
    errorMap: () => ({ message: "Choose a concentration." }),
  }),
  releaseYear: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.coerce
      .number({ invalid_type_error: "Enter a year." })
      .int("Enter a year.")
      .min(1700, "That year looks too early.")
      .max(new Date().getUTCFullYear() + 1, "That year is in the future.")
      .optional(),
  ),
});
export type SubmitFragranceInput = z.infer<typeof SubmitFragranceInput>;
