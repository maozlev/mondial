"use client";

import { useEffect, useState } from "react";

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  stage: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
}

export default function AdminResultsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [results, setResults] = useState<Record<string, { home: number; away: number }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    const res = await fetch("/api/matches");
    const data: Match[] = await res.json();
    setMatches(data);
    const existing: Record<string, { home: number; away: number }> = {};
    for (const m of data) {
      if (m.homeScore !== null && m.awayScore !== null) {
        existing[m.id] = { home: m.homeScore, away: m.awayScore };
      }
    }
    setResults(existing);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (match: Match) => {
    const r = results[match.id] ?? { home: 0, away: 0 };
    setSaving(match.id);
    const res = await fetch(`/api/matches/${match.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeScore: r.home, awayScore: r.away }),
    });
    setSaving(null);
    if (res.ok) {
      setMessage(`נשמר: ${match.homeTeam} ${r.home}:${r.away} ${match.awayTeam}`);
      load();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-yellow-400 mb-2">הזנת תוצאות</h1>
      <p className="text-gray-400 text-sm mb-6">לאחר שמירה, הניקוד מחושב אוטומטית</p>

      {message && <p className="text-green-400 mb-4 text-sm">{message}</p>}

      <div className="space-y-3">
        {matches.map(m => {
          const r = results[m.id] ?? { home: m.homeScore ?? 0, away: m.awayScore ?? 0 };
          return (
            <div key={m.id}
              className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center gap-4">
              <div className="flex-1 font-medium text-white">
                {m.homeTeam} <span className="text-gray-400">vs</span> {m.awayTeam}
              </div>
              <input type="number" min={0} max={20}
                value={r.home}
                onChange={e => setResults(p => ({ ...p, [m.id]: { ...r, home: +e.target.value } }))}
                className="w-12 text-center bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white" />
              <span className="text-gray-400">:</span>
              <input type="number" min={0} max={20}
                value={r.away}
                onChange={e => setResults(p => ({ ...p, [m.id]: { ...r, away: +e.target.value } }))}
                className="w-12 text-center bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white" />
              <button onClick={() => handleSave(m)} disabled={saving === m.id}
                className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm px-3 py-1 rounded">
                {saving === m.id ? "..." : "שמור"}
              </button>
              {m.status === "FINISHED" && (
                <span className="text-xs text-gray-400">✓ נשמר</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
