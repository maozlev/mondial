"use client";

import { useEffect, useState } from "react";

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  stage: string;
  groupName: string | null;
  status: string;
  scheduledAt: string;
  homeScore: number | null;
  awayScore: number | null;
}

const STAGES = ["GROUP", "R32", "R16", "QF", "SF", "THIRD", "FINAL"];
const STAGE_LABELS: Record<string, string> = {
  GROUP: "שלב הבתים", R32: "סיבוב 32", R16: "שמינית גמר",
  QF: "רבע גמר", SF: "חצי גמר", THIRD: "גומלין", FINAL: "גמר",
};

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState({
    homeTeam: "", awayTeam: "", stage: "GROUP", groupName: "",
    scheduledAt: "",
  });
  const [message, setMessage] = useState("");

  const load = async () => {
    const res = await fetch("/api/matches");
    setMatches(await res.json());
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, scheduledAt: new Date(form.scheduledAt).toISOString() }),
    });
    if (res.ok) {
      setAdding(false);
      setForm({ homeTeam: "", awayTeam: "", stage: "GROUP", groupName: "", scheduledAt: "" });
      setMessage("משחק נוסף!");
      load();
    } else {
      setMessage("שגיאה");
    }
  };

  const handleLock = async (id: string, lock: boolean) => {
    await fetch(`/api/matches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: lock ? "LOCKED" : "UPCOMING" }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק?")) return;
    await fetch(`/api/matches/${id}`, { method: "DELETE" });
    load();
  };

  const handleImport = async () => {
    setImporting(true);
    const res = await fetch("/api/matches/import", { method: "POST" });
    const data = await res.json();
    setImporting(false);
    setMessage(`יובאו ${data.created} משחקים (${data.skipped} דולגו)`);
    load();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-yellow-400">ניהול משחקים</h1>
        <div className="flex gap-2">
          <button onClick={() => setAdding(!adding)}
            className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded text-sm">
            + הוסף משחק
          </button>
          <button onClick={handleImport} disabled={importing}
            className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded text-sm">
            {importing ? "מייבא..." : "ייבא מ-API"}
          </button>
        </div>
      </div>

      {message && <p className="text-green-400 mb-4 text-sm">{message}</p>}

      {adding && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 grid grid-cols-2 gap-3">
          <input placeholder="קבוצה בית" value={form.homeTeam}
            onChange={e => setForm(p => ({ ...p, homeTeam: e.target.value }))}
            className="input-field" />
          <input placeholder="קבוצה אורח" value={form.awayTeam}
            onChange={e => setForm(p => ({ ...p, awayTeam: e.target.value }))}
            className="input-field" />
          <select value={form.stage} onChange={e => setForm(p => ({ ...p, stage: e.target.value }))}
            className="input-field">
            {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
          <input placeholder="בית (A, B...)" value={form.groupName}
            onChange={e => setForm(p => ({ ...p, groupName: e.target.value }))}
            className="input-field" />
          <input type="datetime-local" value={form.scheduledAt}
            onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))}
            className="input-field col-span-2" />
          <button onClick={handleAdd}
            className="col-span-2 bg-green-700 hover:bg-green-600 text-white py-2 rounded">
            שמור
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-3 py-2 text-right">משחק</th>
              <th className="px-3 py-2 text-right">שלב</th>
              <th className="px-3 py-2 text-right">תאריך</th>
              <th className="px-3 py-2 text-right">סטטוס</th>
              <th className="px-3 py-2 text-right">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {matches.map(m => (
              <tr key={m.id} className="bg-gray-900/30 hover:bg-gray-800/50">
                <td className="px-3 py-2">{m.homeTeam} vs {m.awayTeam}</td>
                <td className="px-3 py-2 text-gray-400">{STAGE_LABELS[m.stage] ?? m.stage}</td>
                <td className="px-3 py-2 text-gray-400">
                  {new Date(m.scheduledAt).toLocaleDateString("he-IL")}
                </td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    m.status === "FINISHED" ? "bg-gray-700 text-gray-300" :
                    m.status === "LOCKED" ? "bg-orange-900 text-orange-300" :
                    "bg-green-900 text-green-300"
                  }`}>{m.status}</span>
                </td>
                <td className="px-3 py-2 flex gap-2">
                  {m.status === "UPCOMING" && (
                    <button onClick={() => handleLock(m.id, true)}
                      className="text-xs bg-orange-800 hover:bg-orange-700 text-white px-2 py-1 rounded">
                      נעל
                    </button>
                  )}
                  {m.status === "LOCKED" && (
                    <button onClick={() => handleLock(m.id, false)}
                      className="text-xs bg-green-800 hover:bg-green-700 text-white px-2 py-1 rounded">
                      שחרר
                    </button>
                  )}
                  <button onClick={() => handleDelete(m.id)}
                    className="text-xs bg-red-900 hover:bg-red-800 text-white px-2 py-1 rounded">
                    מחק
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
