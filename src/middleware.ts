import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Protect /admin/* routes
  if (pathname.startsWith("/admin")) {
    const session = req.auth;
    if (!session) {
      const signInUrl = new URL("/api/auth/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
    if (!isAdmin(session.user?.email)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Protect /predictions/* routes
  if (pathname.startsWith("/predictions")) {
    const session = req.auth;
    if (!session) {
      const signInUrl = new URL("/api/auth/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/predictions/:path*"],
};
