"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteUserButton({
  userId,
  userName,
  isSelf,
}: {
  userId: string;
  userName: string;
  isSelf: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (isSelf) return null;

  const handleDelete = async () => {
    if (!window.confirm(`למחוק את "${userName}"? כל הניחושים שלו יימחקו לצמיתות.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error ?? "שגיאה במחיקה");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="מחק משתמש"
      className="text-gray-600 hover:text-red-400 disabled:opacity-40 transition-colors text-xs px-1.5 py-1 rounded hover:bg-red-900/30"
    >
      {loading ? "..." : "🗑"}
    </button>
  );
}
