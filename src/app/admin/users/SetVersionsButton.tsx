"use client";

import { useState } from "react";

export function SetVersionsButton({
  userId,
  current,
}: {
  userId: string;
  current: number;
}) {
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  const handleChange = async (newVal: number) => {
    setValue(newVal);
    setSaving(true);
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxVersions: newVal }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <select
      value={value}
      disabled={saving}
      onChange={(e) => handleChange(Number(e.target.value))}
      className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1 disabled:opacity-50 focus:outline-none focus:border-yellow-500"
    >
      {[1, 2, 3].map((n) => (
        <option key={n} value={n}>
          {n} גרסאות
        </option>
      ))}
    </select>
  );
}
