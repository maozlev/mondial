"use client";

import { useEffect, useState } from "react";

interface Settings {
  leaderboard_mode?: string;
  predictions_locked?: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    const res = await fetch("/api/admin/settings");
    setSettings(await res.json());
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leaderboard_mode: settings.leaderboard_mode ?? "SEPARATE",
        predictions_locked: settings.predictions_locked === "true",
      }),
    });
    setSaving(false);
    setMessage(res.ok ? "נשמר!" : "שגיאה");
    load();
  };

  const isLocked = settings.predictions_locked === "true";
  const mode = settings.leaderboard_mode ?? "SEPARATE";

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-yellow-400 mb-6">הגדרות מערכת</h1>

      <div className="space-y-6">
        {/* Leaderboard mode */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-3">מצב לוח מובילים</h2>
          <div className="space-y-2">
            {[
              { value: "SEPARATE", label: "נפרד — כל גרסה מתחרה בנפרד (3 דירוגים)" },
              { value: "BEST", label: "הטוב ביותר — רק הגרסה הטובה של כל שחקן" },
              { value: "SUM", label: "סכום — סכום כל הגרסאות" },
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="mode" value={opt.value} checked={mode === opt.value}
                  onChange={e => setSettings(p => ({ ...p, leaderboard_mode: e.target.value }))}
                  className="accent-green-500" />
                <span className="text-sm text-gray-300">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Global lock */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-3">נעילה גלובלית</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isLocked}
              onChange={e => setSettings(p => ({
                ...p, predictions_locked: e.target.checked ? "true" : "false"
              }))}
              className="w-5 h-5 accent-orange-500" />
            <span className="text-sm text-gray-300">
              {isLocked ? "🔒 כל הניחושים נעולים" : "🟢 ניחושים פתוחים"}
            </span>
          </label>
          {isLocked && (
            <p className="text-xs text-orange-400 mt-2">
              שום משתמש לא יכול לשמור ניחושים כרגע
            </p>
          )}
        </div>

        <button onClick={handleSave} disabled={saving}
          className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg w-full">
          {saving ? "שומר..." : "שמור הגדרות"}
        </button>

        {message && <p className="text-center text-sm text-green-400">{message}</p>}
      </div>
    </div>
  );
}
