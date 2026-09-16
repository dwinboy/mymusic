import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config (no Prisma/bcrypt here) used by middleware for
 * route protection. The full config with providers lives in auth.ts.
 */
export const authConfig = {
  // Required for self-hosted production deployments (Docker, a plain Node
  // server, etc.) where Auth.js can't infer a trusted host the way it can
  // on Vercel. The actual origin is still pinned via NEXTAUTH_URL — this
  // just stops Auth.js from rejecting the incoming Host header outright.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // Pure token/session shaping — safe to run at the edge (no DB access).
    // Defined here (not just in auth.ts) so `role` is present on the session
    // wherever this shared authConfig is used, including inside proxy.ts.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "USER" | "ADMIN") ?? "USER";
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

      if (isAdminRoute) {
        return isLoggedIn && auth?.user?.role === "ADMIN";
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
