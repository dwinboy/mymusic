import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      const token = await authConfig.callbacks.jwt(params);
      // Signing in: the row was just read, so there's nothing to confirm.
      if (params.user || !token?.id) return token;

      // A token outlives the row it describes. Someone deletes their account
      // on their phone and their laptop still holds a JWT that's valid for
      // weeks — every write it attempts then fails on a foreign key that no
      // longer resolves, which reaches the listener as a 500. Returning null
      // ends that session and clears its cookie instead.
      //
      // This is the Node config, not the edge one `proxy.ts` runs, so the
      // query is a single indexed lookup on requests that are signed in.
      try {
        const account = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        if (!account) return null;
        // Free while we're here: a promotion or demotion now takes effect on
        // the next request rather than at the next sign-in.
        token.role = account.role;
      } catch {
        // A database blip is not a reason to sign the whole site out.
      }
      return token;
    },
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user?.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
});
