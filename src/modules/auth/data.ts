import "server-only";
import { prisma } from "@/lib/prisma";

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function createUserWithPassword(input: {
  email: string;
  name?: string;
  passwordHash: string;
  timezone: string;
}) {
  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
      timezone: input.timezone,
    },
    select: { id: true, email: true, name: true },
  });
}
