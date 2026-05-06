"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getFlagUrl } from "@/lib/flags";

const GROUPS: Record<string, string[]> = {
  A: ["Mexico", "South Africa", "South Korea", "Czech Republic"],
  B: ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["United States", "Paraguay", "Australia", "Turkey"],
  E: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};

type GroupResult = {
  groupName: string;
  rank1: string;
  rank2: string;
  rank3: string;
  rank4: string;
};

export default function AdminGroupStandingsPage() {
  const [results, setResults] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      Object.entries(GROUPS).map(([g, teams]) => [g, [...teams]])
    )
  );
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/admin/group-standings")
      .then((r) => {
        if (!r.ok) return [];
        return r.json();
      })
      .then((data: GroupResult[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        setResults((prev) => {
          const next = { ...prev };
          for (const row of data) {
            next[row.groupName] = [row.rank1, row.rank2, row.rank3, row.rank4];
          }
          return next;
        });
      });
  }, []);

  async function saveGroup(groupName: string) {
    const order = results[groupName];
    setSaving((s) => ({ ...s, [groupName]: true }));
    setMessages((m) => ({ ...m, [groupName]: "" }));

    const res = await fetch("/api/admin/group-standings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupName,
        rank1: order[0],
        rank2: order[1],
        rank3: order[2],
        rank4: order[3],
      }),
    });
    setSaving((s) => ({ ...s, [groupName]: false }));
    setMessages((m) => ({
      ...m,
      [groupName]: res.ok ? "✓ נשמר" : "✗ שגיאה",
    }));
  }

  function setTeamAtRank(groupName: string, rankIdx: number, team: string) {
    setResults((prev) => {
      const next = [...prev[groupName]];
      // If the new team is already somewhere else in this group, swap
      const existingIdx = next.indexOf(team);
      if (existingIdx !== -1 && existingIdx !== rankIdx) {
        next[existingIdx] = next[rankIdx];
      }
      next[rankIdx] = team;
      return { ...prev, [groupName]: next };
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">תוצאות עמדות קבוצות</h1>
        <Link
          href="/admin"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← חזרה לדשבורד
        </Link>
      </div>

      <p className="text-gray-400 text-sm mb-6">
        הגדר את הסדר הסופי בכל בית כפי שיקבע ניקוד
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(results).map(([groupName, order]) => (
          <div
            key={groupName}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4"
          >
            <h3 className="text-sm font-bold text-yellow-400 mb-3">
              בית {groupName}
            </h3>
            <div className="space-y-2">
              {[0, 1, 2, 3].map((rankIdx) => {
                const teams = GROUPS[groupName];
                const flagUrl = getFlagUrl(order[rankIdx]);
                return (
                  <div key={rankIdx} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-4">{rankIdx + 1}</span>
                    {flagUrl && (
                      <img
                        src={flagUrl}
                        alt={order[rankIdx]}
                        className="w-6 h-4 object-cover rounded-sm"
                      />
                    )}
                    <select
                      value={order[rankIdx]}
                      onChange={(e) =>
                        setTeamAtRank(groupName, rankIdx, e.target.value)
                      }
                      className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-yellow-500"
                    >
                      {teams.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-green-400">
                {messages[groupName] ?? ""}
              </span>
              <button
                onClick={() => saveGroup(groupName)}
                disabled={saving[groupName]}
                className="text-xs bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold px-3 py-1 rounded transition-colors"
              >
                {saving[groupName] ? "..." : "שמור"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
