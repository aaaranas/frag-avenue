import { z } from "zod";

export const CreateClubInput = z.object({
  name: z
    .string({ required_error: "Name your club." })
    .trim()
    .min(3, "At least 3 characters.")
    .max(60, "60 characters at most.")
    .refine((v) => /[\p{L}\p{N}]/u.test(v), "Use some letters or numbers."),
  description: z.preprocess(
    (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
    z.string().trim().max(280, "280 characters at most.").optional(),
  ),
});
export type CreateClubInput = z.infer<typeof CreateClubInput>;

export const ClubRef = z.object({ clubId: z.string().trim().min(1).max(64) });
