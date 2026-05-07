import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.passwordHash) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          approvedAt: user.approvedAt,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, user object is present — embed id + role + isApproved in token
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: Role }).role ?? "USER";
        token.isApproved = !!(user as { approvedAt?: Date | null }).approvedAt;
      }
      const tokenId = typeof token.id === "string" ? token.id : undefined;
      // Re-check approval from DB while not yet approved (lazy sync)
      if (tokenId && !token.isApproved) {
        const dbUser = await prisma.user.findUnique({
          where: { id: tokenId },
          select: { approvedAt: true, role: true },
        });
        if (dbUser) {
          token.isApproved = !!dbUser.approvedAt;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const tokenRole = token.role === "ADMIN" ? "ADMIN" : "USER";
        const tokenApproved = token.isApproved === true;
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.role = tokenRole;
        session.user.isApproved = tokenApproved;
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
          (user as { role?: Role }).role = "ADMIN";
        } catch {
          // User not yet in DB on first login — will be promoted on next sign-in
        }
      }
      return true;
    },
  },
});
