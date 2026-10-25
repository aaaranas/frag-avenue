import "server-only";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "./passwords";
import { SignInInput } from "./schema";
import { googleEnabled } from "./google";

/**
 * Auth.js v5 configuration.
 *
 * Session strategy is JWT because the Credentials provider does not support
 * database sessions. The Prisma adapter persists Google users and their linked
 * `Account` rows.
 *
 * Google is added only when AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET are set (it
 * reads them itself). A Google sign-in whose email already belongs to another
 * account is refused (`OAuthAccountNotLinked`) rather than linked: password
 * accounts never verified their email, so auto-linking would hand the account
 * to whoever registered the address first. Signed-in users link Google from
 * their profile instead, which Auth.js attaches to the current session's user.
 */
export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
    // OAuth failures land back on the sign-in screen with `?error=<code>`.
    error: "/sign-in",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = SignInInput.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: { id: true, email: true, name: true, image: true, passwordHash: true },
        });
        if (!user?.passwordHash) return null;

        const ok = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
    ...(googleEnabled() ? [Google] : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      // Only addresses Google has verified may sign in or create an account.
      if (account?.provider === "google") return profile?.email_verified === true;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
