import "server-only";
import NextAuth from "next-auth";
import { authConfig } from "@/modules/auth/config";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
