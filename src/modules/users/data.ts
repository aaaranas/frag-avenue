import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type UserPreferences = {
  timezone: string;
  units: "METRIC" | "IMPERIAL";
  defaultCurrency: string;
};

/** Preferences for the signed-in user. Null only if the account was deleted mid-session. */
export function findUserPreferences(userId: string): Promise<UserPreferences | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true, units: true, defaultCurrency: true },
  });
}

export async function updateUserTimeZone(userId: string, timezone: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { timezone } });
}

export function findProfileSettings(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, name: true, bio: true, defaultVisibility: true, units: true },
  });
}

/**
 * Saves profile fields. Returns "taken" when the username belongs to someone
 * else (checked by the unique index, so concurrent claims cannot both win).
 */
export async function updateProfile(
  userId: string,
  data: {
    username: string;
    name?: string | null;
    bio?: string | null;
    defaultVisibility?: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
    units?: "METRIC" | "IMPERIAL";
  },
): Promise<"ok" | "taken"> {
  try {
    await prisma.user.update({ where: { id: userId }, data });
    return "ok";
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return "taken";
    throw err;
  }
}
