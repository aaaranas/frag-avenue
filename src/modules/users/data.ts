import "server-only";
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
