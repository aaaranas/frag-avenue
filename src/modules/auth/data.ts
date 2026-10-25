import "server-only";
import { prisma } from "@/lib/prisma";

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

/** Whether a (normalised) username is already in use. */
export async function isUsernameTaken(username: string): Promise<boolean> {
  return (await prisma.user.findUnique({ where: { username }, select: { id: true } })) !== null;
}

export function createUserWithPassword(input: {
  email: string;
  name?: string;
  passwordHash: string;
  timezone: string;
  username: string;
}) {
  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
      timezone: input.timezone,
      username: input.username,
    },
    select: { id: true, email: true, name: true },
  });
}

/** How this user can sign in: a password, Google, or both. */
export async function findSignInMethods(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, accounts: { select: { provider: true } } },
  });
  return {
    password: Boolean(user?.passwordHash),
    google: user?.accounts.some((a) => a.provider === "google") ?? false,
  };
}
