import "server-only";
import { cache } from "react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type UserPreferences = {
  timezone: string;
  units: "METRIC" | "IMPERIAL";
  defaultCurrency: string;
};

/**
 * The signed-in user's own settings, read once per request: the shell layout,
 * the page, and the page's components each ask for some of them, and each read
 * would otherwise be another round trip to the database. Null only if the
 * account was deleted mid-session.
 */
export const findUserSettings = cache((userId: string) =>
  prisma.user.findUnique({
    where: { id: userId },
    select: {
      timezone: true,
      units: true,
      defaultCurrency: true,
      defaultVisibility: true,
      username: true,
      name: true,
      bio: true,
    },
  }),
);

/** Preferences for the signed-in user. Null only if the account was deleted mid-session. */
export async function findUserPreferences(userId: string): Promise<UserPreferences | null> {
  const user = await findUserSettings(userId);
  return user
    ? { timezone: user.timezone, units: user.units, defaultCurrency: user.defaultCurrency }
    : null;
}

export async function updateUserTimeZone(userId: string, timezone: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { timezone } });
}

export async function findProfileSettings(userId: string) {
  const user = await findUserSettings(userId);
  return user
    ? {
        username: user.username,
        name: user.name,
        bio: user.bio,
        defaultVisibility: user.defaultVisibility,
        units: user.units,
      }
    : null;
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
