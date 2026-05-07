"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export function Navbar() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-3 py-2.5 flex items-center justify-between gap-2 min-w-0">
      {/* Left: logo + nav links (scrollable on mobile) */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide min-w-0 flex-1">
        <Link
          href="/"
          className="text-green-400 font-bold text-base tracking-tight flex-shrink-0 ml-1 mr-3"
        >
          ⚽ 2026
        </Link>
        <Link href="/" className="text-xs sm:text-sm text-gray-300 hover:text-white flex-shrink-0 px-2 py-1">
          לוח מובילים
        </Link>
        <Link href="/matches" className="text-xs sm:text-sm text-gray-300 hover:text-white flex-shrink-0 px-2 py-1">
          משחקים
        </Link>
        {session && (
          <Link href="/predictions" className="text-xs sm:text-sm text-gray-300 hover:text-white flex-shrink-0 px-2 py-1">
            הניחושים שלי
          </Link>
        )}
        {isAdmin && (
          <Link href="/admin" className="text-xs sm:text-sm text-yellow-400 hover:text-yellow-300 flex-shrink-0 px-2 py-1">
            ניהול
          </Link>
        )}
      </div>

      {/* Right: user */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {session ? (
          <>
            <span className="hidden sm:block text-xs text-gray-400 truncate max-w-[120px]">
              {session.user?.name}
            </span>
            <button
              onClick={() => signOut()}
              className="text-xs bg-gray-800 hover:bg-gray-700 px-2.5 py-1 rounded whitespace-nowrap"
            >
              יציאה
            </button>
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <Link
              href="/register"
              className="text-xs bg-gray-700 hover:bg-gray-600 px-2.5 py-1 rounded whitespace-nowrap"
            >
              הרשמה
            </Link>
            <button
              onClick={() => signIn("google")}
              className="text-xs bg-green-600 hover:bg-green-500 px-2.5 py-1 rounded font-medium whitespace-nowrap"
            >
              כניסה
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
