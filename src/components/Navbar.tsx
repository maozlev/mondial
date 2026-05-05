"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export function Navbar() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-green-400 font-bold text-lg tracking-tight">
          ⚽ מונדיאל 2026
        </Link>
        <Link href="/" className="text-sm text-gray-300 hover:text-white">
          לוח מובילים
        </Link>
        {session && (
          <Link href="/predictions" className="text-sm text-gray-300 hover:text-white">
            הניחושים שלי
          </Link>
        )}
        {isAdmin && (
          <Link href="/admin" className="text-sm text-yellow-400 hover:text-yellow-300">
            ניהול
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        {session ? (
          <>
            <span className="text-sm text-gray-400">{session.user?.name}</span>
            <button
              onClick={() => signOut()}
              className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded"
            >
              התנתקות
            </button>
          </>
        ) : (
          <button
            onClick={() => signIn("google")}
            className="text-sm bg-green-600 hover:bg-green-500 px-3 py-1 rounded font-medium"
          >
            התחברות עם Google
          </button>
        )}
      </div>
    </nav>
  );
}
