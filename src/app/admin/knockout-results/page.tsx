"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getFlagUrl } from "@/lib/flags";
import { COUNTRY_CODES } from "@/lib/flags";

const ALL_TEAMS = Object.keys(COUNTRY_CODES);

type Stage = "R16" | "QF" | "SF" | "FINAL" | "WINNER";

const STAGE_CONFIG: { stage: Stage; label: string; slots: number }[] = [
  { stage: "R16", label: "שמינית גמר", slots: 16 },
  { stage: "QF", label: "רבע גמר", slots: 8 },
  { stage: "SF", label: "חצי גמר", slots: 4 },
  { stage: "FINAL", label: "גמר", slots: 2 },
  { stage: "WINNER", label: "אלוף", slots: 1 },
];

type Results = Record<Stage, string[]>;

function emptyResults(): Results {
  return {
    R16: Array(16).fill(""),
    QF: Array(8).fill(""),
    SF: Array(4).fill(""),
    FINAL: Array(2).fill(""),
    WINNER: Array(1).fill(""),
  };
}

export default function AdminKnockoutResultsPage() {
  const [results, setResults] = useState<Results>(emptyResults());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/knockout-results")
      .then((r) => {
        if (!r.ok) return [];
        return r.json();
      })
      .then((data: { stage: Stage; slot: number; teamName: string }[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        const next = emptyResults();
        for (const row of data) {
          const arr = next[row.stage];
          if (arr && row.slot >= 1 && row.slot <= arr.length) {
            arr[row.slot - 1] = row.teamName;
          }
        }
        setResults(next);
      });
  }, []);

  function setSlot(stage: Stage, idx: number, team: string) {
    setResults((prev) => ({
      ...prev,
      [stage]: prev[stage].map((t, i) => (i === idx ? team : t)),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");

    const errors: string[] = [];
    for (const { stage, slots } of STAGE_CONFIG) {
      for (let i = 0; i < slots; i++) {
        const team = results[stage][i];
        if (!team) continue;
        const res = await fetch("/api/admin/knockout-results", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage, slot: i + 1, teamName: team }),
        });
        if (!res.ok) {
          const err = await res.json();
          errors.push(`${stage} slot ${i + 1}: ${err.error ?? "שגיאה"}`);
        }
      }
    }

    setSaving(false);
    setMessage(errors.length === 0 ? "✓ תוצאות נשמרו!" : errors.join(", "));
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">תוצאות ברקט</h1>
        <Link
          href="/admin"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← חזרה לדשבורד
        </Link>
      </div>

      <p className="text-gray-400 text-sm mb-6">
        הגדר את הקבוצות שעלו בכל שלב — ישמש לחישוב ניקוד
      </p>

      {message && (
        <p
          className={`text-sm mb-4 ${
            message.startsWith("✓") ? "text-green-400" : "text-red-400"
          }`}
        >
          {message}
        </p>
      )}

      <div className="overflow-x-auto -mx-4 px-4 mb-8">
        <div className="flex gap-3 min-w-[560px]">
          {STAGE_CONFIG.map(({ stage, label, slots }) => (
            <div key={stage} className="flex flex-col gap-2 flex-1 min-w-[130px]">
              <h2 className="text-xs font-bold text-yellow-400 text-center uppercase tracking-wide pb-1 border-b border-gray-800">
                {label}
              </h2>
              {Array.from({ length: slots }).map((_, idx) => {
                const value = results[stage][idx] ?? "";
                const flagUrl = value ? getFlagUrl(value) : "";
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5"
                  >
                    {flagUrl ? (
                      <img
                        src={flagUrl}
                        alt={value}
                        className="w-6 h-4 object-cover rounded-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-4 flex-shrink-0 rounded-sm bg-gray-700" />
                    )}
                    <select
                      value={value}
                      onChange={(e) => setSlot(stage, idx, e.target.value)}
                      className="flex-1 min-w-0 bg-gray-800 text-sm text-white focus:outline-none cursor-pointer"
                    >
                      <option value="">—</option>
                      {ALL_TEAMS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold px-6 py-2 rounded-lg transition-colors"
        >
          {saving ? "שומר..." : "שמור תוצאות"}
        </button>
      </div>
    </div>
  );
}
