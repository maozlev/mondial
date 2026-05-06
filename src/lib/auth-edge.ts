import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Edge-safe config — no Prisma, no adapter.
// JWT strategy matches main auth.ts so the same cookie is readable in middleware.
export const { auth } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
});
