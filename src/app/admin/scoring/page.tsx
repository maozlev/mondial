"use client";

import { useEffect, useState } from "react";

interface ScoringRule {
  id: string;
  eventType: string;
  name: string;
  nameHe: string;
  points: number;
  isActive: boolean;
  order: number;
}

const BUILTIN_EVENT_TYPES = [
  { value: "winner_correct", label: "ניחוש מנצח נכון" },
  { value: "exact_score", label: "תוצאה מדויקת" },
  { value: "draw_correct", label: "ניחש תיקו ויצא תיקו" },
  { value: "loser_correct", label: "ניחוש מפסיד נכון" },
  { value: "draw_predicted", label: "ניחש תיקו (בלי קשר לתוצאה)" },
];

export default function AdminScoringPage() {
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [adding, setAdding] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    eventType: "winner_correct",
    customEventType: "",
    name: "",
    nameHe: "",
    points: 3,
    isActive: true,
    order: 0,
  });

  const load = async () => {
    const res = await fetch("/api/admin/scoring-rules");
    setRules(await res.json());
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const eventType = form.eventType === "__custom__" ? form.customEventType : form.eventType;
    const res = await fetch("/api/admin/scoring-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, eventType }),
    });
    if (res.ok) {
      setAdding(false);
      setMessage("כלל נוסף!");
      load();
    }
  };

  const handleToggle = async (rule: ScoringRule) => {
    await fetch(`/api/admin/scoring-rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !rule.isActive }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק?")) return;
    await fetch(`/api/admin/scoring-rules/${id}`, { method: "DELETE" });
    load();
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    const res = await fetch("/api/admin/recalculate", { method: "POST" });
    setRecalculating(false);
    setMessage(res.ok ? "חישוב הושלם!" : "שגיאה בחישוב");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-yellow-400">חוקי ניקוד</h1>
        <div className="flex gap-2">
          <button onClick={() => setAdding(!adding)}
            className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded text-sm">
            + כלל חדש
          </button>
          <button onClick={handleRecalculate} disabled={recalculating}
            className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded text-sm">
            {recalculating ? "מחשב..." : "חשב מחדש"}
          </button>
        </div>
      </div>

      {message && <p className="text-green-400 mb-4 text-sm">{message}</p>}

      {adding && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">סוג אירוע</label>
            <select value={form.eventType}
              onChange={e => setForm(p => ({ ...p, eventType: e.target.value }))}
              className="input-field w-full">
              {BUILTIN_EVENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label} ({t.value})</option>
              ))}
              <option value="__custom__">✏️ אירוע מותאם אישית...</option>
            </select>
          </div>
          {form.eventType === "__custom__" && (
            <input placeholder="שם האירוע (e.g. first_scorer)"
              value={form.customEventType}
              onChange={e => setForm(p => ({ ...p, customEventType: e.target.value }))}
              className="input-field col-span-2" />
          )}
          <input placeholder="שם (אנגלית)" value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="input-field" />
          <input placeholder="שם (עברית)" value={form.nameHe}
            onChange={e => setForm(p => ({ ...p, nameHe: e.target.value }))}
            className="input-field" />
          <div>
            <label className="text-xs text-gray-400 mb-1 block">נקודות</label>
            <input type="number" min={0} value={form.points}
              onChange={e => setForm(p => ({ ...p, points: +e.target.value }))}
              className="input-field w-full" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">סדר</label>
            <input type="number" min={0} value={form.order}
              onChange={e => setForm(p => ({ ...p, order: +e.target.value }))}
              className="input-field w-full" />
          </div>
          <button onClick={handleAdd}
            className="col-span-2 bg-green-700 hover:bg-green-600 text-white py-2 rounded">
            שמור
          </button>
        </div>
      )}

      <div className="space-y-2">
        {rules.map(rule => (
          <div key={rule.id}
            className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-medium text-white">{rule.nameHe}</div>
              <div className="text-xs text-gray-500">{rule.eventType}</div>
            </div>
            <div className="text-green-400 font-bold text-lg">{rule.points} נק'</div>
            <button onClick={() => handleToggle(rule)}
              className={`text-xs px-3 py-1 rounded ${
                rule.isActive
                  ? "bg-green-900 text-green-300 hover:bg-green-800"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}>
              {rule.isActive ? "פעיל" : "כבוי"}
            </button>
            <button onClick={() => handleDelete(rule.id)}
              className="text-xs bg-red-900 hover:bg-red-800 text-white px-2 py-1 rounded">
              מחק
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
