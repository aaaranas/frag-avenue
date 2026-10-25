import { z } from "zod";

const id = z.string().trim().min(1).max(64);

export const WearRef = z.object({ wearId: id });
export const UserRef = z.object({ userId: id });
export const CommentRef = z.object({ commentId: id });

export const CommentInput = z.object({
  wearId: id,
  body: z
    .string({ required_error: "Write something first." })
    .trim()
    .min(1, "Write something first.")
    .max(1000, "Keep comments under 1,000 characters."),
});

/** Feed / profile cursor: the id of the last wear shown. */
export const Cursor = z.string().trim().min(1).max(64).optional().catch(undefined);

export const PeopleQuery = z
  .string()
  .trim()
  .max(40)
  .optional()
  .catch(undefined)
  .transform((v) => (v ? v.replace(/^@/, "") : undefined));
