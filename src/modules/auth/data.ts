import "server-only";
import { prisma } from "@/lib/prisma";

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function createUserWithPassword(input: {
  email: string;
  name?: string;
  passwordHash: string;
}) {
  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
    },
    select: { id: true, email: true, name: true },
  });
}
