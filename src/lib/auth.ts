import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, user object is present — embed id + role in token
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as Role) ?? "USER";
      }
      return session;
    },
    async signIn({ user }) {
      // Promote to ADMIN if email matches env var (idempotent)
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail && user.email === adminEmail) {
        try {
          await prisma.user.update({
            where: { email: adminEmail },
            data: { role: "ADMIN" },
          });
          // Also update the token immediately via the user object
          (user as { role?: Role }).role = "ADMIN";
        } catch {
          // User not yet in DB on first login — will be promoted on next sign-in
        }
      }
      return true;
    },
  },
});
