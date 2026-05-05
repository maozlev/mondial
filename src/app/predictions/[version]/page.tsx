"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MatchStage } from "@prisma/client";

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  stage: MatchStage;
  groupName: string | null;
  status: string;
  scheduledAt: string;
}

interface PredictionData {
  matchId: string;
  homeScore: number;
  awayScore: number;
  match: { status: string; homeTeam: string; awayTeam: string; stage: string };
}

const STAGE_LABELS: Record<string, string> = {
  GROUP: "שלב הבתים",
  R32: "סיבוב 32",
  R16: "שמינית גמר",
  QF: "רבע גמר",
  SF: "חצי גמר",
  THIRD: "משחק גומלין",
  FINAL: "גמר",
};

export default function PredictionVersionPage() {
  const { version } = useParams<{ version: string }>();
  const versionNum = parseInt(version, 10);

  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, { home: number; away: number }>>({});
  const [savedPredictions, setSavedPredictions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [activeStage, setActiveStage] = useState<string>("GROUP");

  useEffect(() => {
    fetch("/api/matches")
      .then((r) => r.json())
      .then(setMatches);

    fetch(`/api/predictions/${versionNum}`)
      .then((r) => r.json())
      .then((data: PredictionData[]) => {
        const map: Record<string, { home: number; away: number }> = {};
        const savedSet = new Set<string>();
        for (const p of data) {
          map[p.matchId] = { home: p.homeScore, away: p.awayScore };
          savedSet.add(p.matchId);
        }
        setPredictions(map);
        setSavedPredictions(savedSet);
      });
  }, [versionNum]);

  const stages = [...new Set(matches.map((m) => m.stage))];

  const visibleMatches = matches.filter((m) => m.stage === activeStage);

  const handleChange = (matchId: string, side: "home" | "away", value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return;
    setPredictions((prev) => ({
      ...prev,
      [matchId]: { ...(prev[matchId] ?? { home: 0, away: 0 }), [side]: num },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    const toSave = visibleMatches
      .filter((m) => m.status === "UPCOMING" && predictions[m.id] !== undefined)
      .map((m) => ({
        matchId: m.id,
        homeScore: predictions[m.id].home,
        awayScore: predictions[m.id].away,
      }));

    const res = await fetch(`/api/predictions/${versionNum}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predictions: toSave }),
    });

    const data = await res.json();
    setSaving(false);

    if (res.ok) {
      const newSaved = new Set(savedPredictions);
      for (const p of data.saved) newSaved.add(p.matchId);
      setSavedPredictions(newSaved);
      setMessage(`נשמרו ${data.saved.length} ניחושים`);
    } else {
      setMessage("שגיאה בשמירה");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-green-400 mb-2">גרסה {versionNum}</h1>
      <p className="text-gray-400 mb-6 text-sm">בחר שלב ומלא תחזיות</p>

      {/* Stage tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {stages.map((stage) => (
          <button
            key={stage}
            onClick={() => setActiveStage(stage)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              activeStage === stage
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {STAGE_LABELS[stage] ?? stage}
          </button>
        ))}
      </div>

      {/* Matches */}
      <div className="space-y-3">
        {visibleMatches.map((match) => {
          const pred = predictions[match.id] ?? { home: 0, away: 0 };
          const isLocked = match.status !== "UPCOMING";
          const isSaved = savedPredictions.has(match.id);

          return (
            <div
              key={match.id}
              className={`bg-gray-900 border rounded-lg px-4 py-3 flex items-center justify-between gap-4 ${
                isLocked ? "border-gray-700 opacity-60" : "border-gray-800"
              }`}
            >
              <div className="flex-1">
                <div className="font-medium text-white">
                  {match.homeTeam} <span className="text-gray-400">vs</span> {match.awayTeam}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {new Date(match.scheduledAt).toLocaleDateString("he-IL")}
                  {match.groupName && ` · בית ${match.groupName}`}
                  {isLocked && <span className="text-orange-400 mr-2">🔒 נעול</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={pred.home}
                  onChange={(e) => handleChange(match.id, "home", e.target.value)}
                  disabled={isLocked}
                  className="w-12 text-center bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white disabled:opacity-40"
                />
                <span className="text-gray-400">:</span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={pred.away}
                  onChange={(e) => handleChange(match.id, "away", e.target.value)}
                  disabled={isLocked}
                  className="w-12 text-center bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white disabled:opacity-40"
                />
                {isSaved && <span className="text-green-400 text-xs">✓</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save button */}
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg"
        >
          {saving ? "שומר..." : "שמור"}
        </button>
        {message && <span className="text-sm text-gray-400">{message}</span>}
      </div>
    </div>
  );
}
