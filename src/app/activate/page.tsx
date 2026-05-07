"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ActivatePage() {
  const { data: session, update, status } = useSession();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Already approved — redirect to predictions
  if (status === "authenticated" && session?.user?.isApproved) {
    router.replace("/predictions");
    return null;
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" dir="rtl">
        <div className="text-center max-w-sm">
          <p className="text-gray-400 mb-4">יש להתחבר תחילה לפני הזנת הקוד.</p>
          <Link
            href="/api/auth/signin"
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-2 rounded-lg"
          >
            כניסה
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(code)) {
      setError("הקוד חייב להיות 6 ספרות");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "שגיאה");
        return;
      }

      setSuccess(true);
      // Update the JWT so isApproved becomes true
      await update();
      router.push("/predictions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔑</div>
          <h1 className="text-2xl font-bold text-white">הזן קוד גישה</h1>
          <p className="text-gray-400 mt-2 text-sm">
            קיבלת קוד 6 ספרות מהמנהל — הזן אותו כאן כדי לפתוח גישה לניחושים
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          {success ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-green-400 font-medium">הגישה אושרה! מעביר לניחושים...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">קוד גישה (6 ספרות)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-2xl text-center tracking-widest font-mono focus:outline-none focus:border-yellow-500"
                  dir="ltr"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-2.5 rounded-lg transition-colors"
              >
                {loading ? "מאמת..." : "אמת קוד"}
              </button>
            </form>
          )}

          <p className="text-xs text-gray-600 text-center mt-4">
            לא קיבלת קוד? פנה למנהל הבית
          </p>
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          מחובר כ: {session?.user?.email}
        </p>
      </div>
    </div>
  );
}
