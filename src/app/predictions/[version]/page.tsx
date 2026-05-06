"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { MatchStage } from "@prisma/client";
import { MatchCard } from "@/components/MatchCard";

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  stage: MatchStage;
  groupName: string | null;
  status: string;
  scheduledAt: string;
  homeScore: number | null;
  awayScore: number | null;
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
  const [versionLocked, setVersionLocked] = useState(false);
  const [deadline, setDeadline] = useState<string | null>(null);

  useEffect(() => {
    // Check global settings + version deadline
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((s: Record<string, string>) => {
        const globalLocked = s["predictions_locked"] === "true";
        const dl = s[`version_${versionNum}_deadline`] ?? null;
        const pastDeadline = dl ? new Date() > new Date(dl) : false;
        setVersionLocked(globalLocked || pastDeadline);
        setDeadline(dl);
      })
      .catch(() => {});

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
      setMessage((data as { error?: string }).error ?? "שגיאה בשמירה");
    }
  };

  const deadlinePast = deadline ? new Date() > new Date(deadline) : false;

  return (
    <div className="max-w-3xl mx-auto px-3 py-8 sm:px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center font-bold text-white text-sm">
          {versionNum}
        </div>
        <h1 className="text-2xl font-bold text-white">גרסה {versionNum}</h1>
        {versionLocked && (
          <span className="text-xs bg-orange-900/60 text-orange-300 px-2 py-0.5 rounded-full">
            🔒 נעול
          </span>
        )}
      </div>

      {/* Progress + deadline */}
      <div className="mb-5">
        {deadline && (
          <p className={`text-xs mb-2 ${deadlinePast ? "text-red-400" : "text-blue-400"}`}>
            {deadlinePast ? "⏰ הדד-ליין עבר" : "⏰ פתוח עד"}{" "}
            {new Date(deadline).toLocaleString("he-IL", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Jerusalem",
            })}
          </p>
        )}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 rounded-full transition-all"
              style={{
                width:
                  matches.length > 0
                    ? `${Math.round((Object.keys(predictions).length / matches.length) * 100)}%`
                    : "0%",
              }}
            />
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {Object.keys(predictions).length} / {matches.length} ניחושים
          </span>
        </div>
      </div>

      {/* Lock banner */}
      {versionLocked && (
        <div className="bg-orange-900/30 border border-orange-800 rounded-xl px-4 py-3 mb-6 text-sm text-orange-300">
          {deadlinePast
            ? "⏰ הדד-ליין לגרסה זו עבר — לא ניתן לשנות ניחושים"
            : "🔒 הניחושים נעולים כרגע — לא ניתן לשמור"}
        </div>
      )}

      {/* Sub-nav */}
      <div className="flex gap-1 mb-6 border-b border-gray-800 pb-0 overflow-x-auto">
        <span className="px-3 py-2 text-sm text-white font-semibold whitespace-nowrap border-b-2 border-yellow-400">
          תוצאות משחקים
        </span>
        <Link
          href={`/predictions/${versionNum}/standings`}
          className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap border-b-2 border-transparent"
        >
          עמדות קבוצות
        </Link>
        <Link
          href={`/predictions/${versionNum}/bracket`}
          className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap border-b-2 border-transparent"
        >
          ברקט
        </Link>
      </div>

      {/* Stage tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {stages.map((stage) => (
          <button
            key={stage}
            onClick={() => setActiveStage(stage)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
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
      <div className="space-y-2">
        {visibleMatches.map((match) => {
          const pred = predictions[match.id] ?? { home: 0, away: 0 };
          return (
            <MatchCard
              key={match.id}
              match={match}
              mode={versionLocked ? "view" : "predict"}
              homeScore={pred.home}
              awayScore={pred.away}
              onHomeChange={(v) => handleChange(match.id, "home", v)}
              onAwayChange={(v) => handleChange(match.id, "away", v)}
              isSaved={savedPredictions.has(match.id)}
            />
          );
        })}
      </div>

      {/* Save button */}
      {!versionLocked && (
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            {saving ? "שומר..." : "שמור ניחושים"}
          </button>
          {message && <span className="text-sm text-gray-400">{message}</span>}
        </div>
      )}
    </div>
  );
}
