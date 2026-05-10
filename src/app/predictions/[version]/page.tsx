"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { MatchStage } from "@prisma/client";
import { MatchCard } from "@/components/MatchCard";
import { computeGroupOrdersFromPredictions, toStandingRows } from "@/lib/group-standings";

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

type GroupViewMode = "groups" | "dates";
const GROUP_ORDER = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;

const STAGE_LABELS: Record<string, string> = {
  GROUP: "שלב הבתים",
  R32: "סיבוב 32",
  R16: "שמינית גמר",
  QF: "רבע גמר",
  SF: "חצי גמר",
  THIRD: "משחק גומלין",
  FINAL: "גמר",
};

const KNOCKOUT_STAGE_ORDER = ["R32", "R16", "QF", "SF", "FINAL", "WINNER"] as const;

function InstrSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
      <h2 className="text-base font-bold text-yellow-400">{title}</h2>
      {children}
    </div>
  );
}

function InstrRow({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-gray-800 last:border-0">
      <span className="text-gray-300 text-sm">{label}</span>
      <div className="text-right">
        <span className="text-white font-semibold text-sm">{value}</span>
        {sub && <div className="text-gray-500 text-xs mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

interface ScoringRule {
  id: string;
  eventType: string;
  nameHe: string;
  points: number;
  isActive: boolean;
  order: number;
}

function InstructionsContent({ matchRules, maxVersions }: { matchRules: ScoringRule[]; maxVersions: number }) {
  const activeRules = matchRules.filter((r) => r.isActive).sort((a, b) => a.order - b.order);
  return (
    <div className="space-y-5 mt-2">
      <InstrSection title="📋 סקירה כללית">
        <p className="text-gray-300 text-sm leading-relaxed">
          יש לכם <strong className="text-white">{maxVersions} {maxVersions === 1 ? "גרסא" : "גרסאות"}</strong> לניחושים —{" "}
          {maxVersions === 1
            ? "גרסה זו היא ההזדמנות שלכם."
            : "כל גרסה מתחרה בטבלת דירוג נפרדת."}
          {" "}בכל גרסה ניתן לנחש תוצאות משחקי שלב הבתים, עמדות הקבוצות בכל בית, וברקט הנוקאאוט המלא.
        </p>
        <p className="text-gray-300 text-sm leading-relaxed">
          לכל גרסה יש <strong className="text-white">דד-ליין</strong> — לאחריו לא ניתן לשנות ניחושים.
        </p>
      </InstrSection>
      <InstrSection title="⚽ ניחוש תוצאות משחקים">
        <p className="text-gray-300 text-sm leading-relaxed">
          מזינים כמה גולים בית ואורח, לוחצים על <strong className="text-white">שמור ניחושים</strong>.
          ניתן לסנן לפי בית או לפי תאריך. ניחושים שנשמרו מודגשים.
        </p>
      </InstrSection>
      <InstrSection title="🏅 ניקוד — שלב הבתים">
        {activeRules.length > 0 ? (
          activeRules.map((r) => (
            <InstrRow key={r.id} label={r.nameHe} value={`${r.points} נקודות`} />
          ))
        ) : (
          <>
            <InstrRow label="ניחוש מנצח נכון" value="3 נקודות" sub="ניחשת נכון מי ניצח (לא חייב תוצאה מדויקת)" />
            <InstrRow label="תוצאה מדויקת" value="5 נקודות" sub="ניחשת את הניקוד המדויק — כולל ה-3 של מנצח נכון" />
            <InstrRow label="ניחוש תיקו" value="2 נקודות" sub="ניחשת תיקו ויצא תיקו (ללא ציין מדויק)" />
            <InstrRow label="ניחוש מפסיד נכון" value="1 נקודה" sub="ניחשת נכון מי הפסיד (גם כשהמנצח שגוי)" />
          </>
        )}
      </InstrSection>
      <InstrSection title="📊 עמדות קבוצות">
        <p className="text-gray-300 text-sm leading-relaxed">
          ב<strong className="text-white">טאב "עמדות קבוצות"</strong> מסדרים את 4 הנבחרות בכל בית לפי הסדר הצפוי (1-4).
          ניתן לגרור ולשחרר. טיפ: לחץ "חשב מניחושי תוצאות" לסדר אוטומטי.
        </p>
      </InstrSection>
      <InstrSection title="🏅 ניקוד — עמדות קבוצות">
        <InstrRow label="מקום 1 בבית" value="10 נקודות" sub="לכל בית שניחשת נכון מי יסיים ראשון" />
        <InstrRow label="מקום 2 בבית" value="7 נקודות" sub="לכל בית שניחשת נכון מי יסיים שני" />
        <InstrRow label="מקום 3 שעלה לסיבוב 32" value="4 נקודות" sub="רק אם הקבוצה אכן עלתה מהמקום השלישי" />
        <p className="text-gray-500 text-xs pt-1">12 בתים → מקסימום <strong className="text-gray-300">204 נקודות</strong>.</p>
      </InstrSection>
      <InstrSection title="🏆 ברקט נוקאאוט">
        <p className="text-gray-300 text-sm leading-relaxed">
          ב<strong className="text-white">טאב "ברקט"</strong> בוחרים מי יעלה בכל שלב.
          עמדות 1/2 מתמלאות מעמדות הקבוצות, עמדות 3 נבחרות ידנית.
          שינוי בשלב נמוך מנקה את השלבים הבאים אוטומטית.
        </p>
      </InstrSection>
      <InstrSection title="🏅 ניקוד — ברקט נוקאאוט">
        <InstrRow label="הגעה לסיבוב 32" value="2 נקודות" />
        <InstrRow label="הגעה לשמינית גמר" value="3 נקודות" />
        <InstrRow label="הגעה לרבע גמר" value="5 נקודות" />
        <InstrRow label="הגעה לחצי גמר" value="10 נקודות" />
        <InstrRow label="הגעה לגמר" value="20 נקודות" />
        <InstrRow label="אלוף" value="40 נקודות" />
        <p className="text-gray-500 text-xs pt-1">נבחרת שהגיעה לגמר = 2+3+5+10+20 = <strong className="text-gray-300">40 נקודות</strong> + 40 אם ניחשת אותה אלופה.</p>
      </InstrSection>
      <InstrSection title="🔄 גרסאות">
        <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
          {maxVersions > 1 && <li>{maxVersions} גרסאות עצמאיות — כל גרסה מתחרה בנפרד</li>}
          <li>לכל גרסה דד-ליין משלה</li>
          {maxVersions > 1 && <li>ניחושים בגרסה אחת לא משפיעים על האחרות</li>}
        </ul>
      </InstrSection>
    </div>
  );
}

export default function PredictionVersionPage() {
  const { version } = useParams<{ version: string }>();
  const versionNum = parseInt(version, 10);

  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, { home: number; away: number }>>({});
  const [savedPredictions, setSavedPredictions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [activeStage, setActiveStage] = useState<string>("GROUP");
  const [groupViewMode, setGroupViewMode] = useState<GroupViewMode>("groups");
  const [versionLocked, setVersionLocked] = useState(false);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>([]);
  const [maxVersions, setMaxVersions] = useState(1);
  const [knockoutStageCounts, setKnockoutStageCounts] = useState<Record<string, number>>({});
  const lastAutoSyncHash = useRef<string>("");

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

    fetch("/api/admin/scoring-rules")
      .then((r) => r.json())
      .then((data: ScoringRule[]) => Array.isArray(data) && setScoringRules(data))
      .catch(() => {});

    fetch("/api/user/me")
      .then((r) => r.json())
      .then((data: { maxVersions?: number }) => typeof data.maxVersions === "number" && setMaxVersions(data.maxVersions))
      .catch(() => {});

    fetch(`/api/predictions/${versionNum}/knockout`)
      .then((r) => r.json())
      .then((data: { stage: string }[]) => {
        if (!Array.isArray(data)) return;
        const counts: Record<string, number> = {};
        for (const pick of data) {
          counts[pick.stage] = (counts[pick.stage] ?? 0) + 1;
        }
        setKnockoutStageCounts(counts);
      })
      .catch(() => {});

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
        setReady(true);
      });
  }, [versionNum]);

  const stages = [...new Set(matches.map((m) => m.stage))];
  const visibleMatches = useMemo(
    () => matches.filter((m) => m.stage === activeStage).sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt)),
    [matches, activeStage]
  );

  const groupSections = useMemo(() => {
    const sections = new Map<string, Match[]>();
    for (const match of visibleMatches) {
      const group = match.groupName ?? "?";
      if (!sections.has(group)) sections.set(group, []);
      sections.get(group)?.push(match);
    }
    return [...sections.entries()]
      .sort(([a], [b]) => {
        const aIdx = GROUP_ORDER.indexOf(a as (typeof GROUP_ORDER)[number]);
        const bIdx = GROUP_ORDER.indexOf(b as (typeof GROUP_ORDER)[number]);
        if (aIdx === -1 && bIdx === -1) return a.localeCompare(b, "he");
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      })
      .map(([groupName, groupMatches]) => ({ groupName, matches: groupMatches }));
  }, [visibleMatches]);

  const dateSections = useMemo(() => {
    const sections = new Map<string, Match[]>();
    for (const match of visibleMatches) {
      const key = new Date(match.scheduledAt).toLocaleDateString("he-IL", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "Asia/Jerusalem",
      });
      if (!sections.has(key)) sections.set(key, []);
      sections.get(key)?.push(match);
    }
    return [...sections.entries()].map(([dateLabel, groupedMatches]) => ({ dateLabel, matches: groupedMatches }));
  }, [visibleMatches]);

  const stageMatchIds = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const m of matches) {
      if (!map[m.stage]) map[m.stage] = [];
      map[m.stage].push(m.id);
    }
    return map;
  }, [matches]);

  useEffect(() => {
    if (!ready || versionLocked) return;
    const groupOrders = computeGroupOrdersFromPredictions(matches, predictions);
    const standings = toStandingRows(groupOrders);
    if (standings.length === 0) return;

    const sortedRows = [...standings].sort((a, b) => a.groupName.localeCompare(b.groupName, "en"));
    const hash = JSON.stringify(sortedRows);
    if (hash === lastAutoSyncHash.current) return;

    const timeoutId = setTimeout(async () => {
      const res = await fetch(`/api/predictions/${versionNum}/standings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ standings: sortedRows }),
      });
      if (res.ok) {
        lastAutoSyncHash.current = hash;
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [matches, predictions, ready, versionLocked, versionNum]);

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

  const handleResetStage = async (stage: string) => {
    const ids = stageMatchIds[stage] ?? [];
    const count = ids.filter((id) => savedPredictions.has(id)).length;
    const label = STAGE_LABELS[stage] ?? stage;
    if (!window.confirm(`לאפס את ${label}? (${count} ניחושים יימחקו)`)) return;
    setResetting(true);

    const requests: Promise<Response>[] = [
      fetch(`/api/predictions/${versionNum}?stage=${stage}`, { method: "DELETE" }),
    ];
    if (stage === "GROUP") {
      requests.push(fetch(`/api/predictions/${versionNum}/standings`, { method: "DELETE" }));
      requests.push(fetch(`/api/predictions/${versionNum}/knockout?fromStage=R32`, { method: "DELETE" }));
    } else if ((KNOCKOUT_STAGE_ORDER as readonly string[]).includes(stage)) {
      requests.push(fetch(`/api/predictions/${versionNum}/knockout?fromStage=${stage}`, { method: "DELETE" }));
    }
    await Promise.all(requests);

    setPredictions((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
    setSavedPredictions((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
    if (stage === "GROUP") lastAutoSyncHash.current = "";
    setResetting(false);
    // Clear knockoutStageCounts for affected knockout stages
    if (stage === "GROUP") {
      setKnockoutStageCounts({});
    } else if ((KNOCKOUT_STAGE_ORDER as readonly string[]).includes(stage)) {
      const fromIdx = KNOCKOUT_STAGE_ORDER.indexOf(stage as typeof KNOCKOUT_STAGE_ORDER[number]);
      const cleared = KNOCKOUT_STAGE_ORDER.slice(fromIdx);
      setKnockoutStageCounts((prev) => {
        const next = { ...prev };
        for (const s of cleared) delete next[s];
        return next;
      });
    }
    setMessage(`${label} אופסה`);
  };

  const handleResetAll = async () => {
    const total = savedPredictions.size;
    if (!window.confirm(`לאפס את כל הניחושים? (${total} ניחושים, עמדות קבוצות וברקט יימחקו)`)) return;
    setResetting(true);
    await Promise.all([
      fetch(`/api/predictions/${versionNum}`, { method: "DELETE" }),
      fetch(`/api/predictions/${versionNum}/standings`, { method: "DELETE" }),
      fetch(`/api/predictions/${versionNum}/knockout`, { method: "DELETE" }),
    ]);
    setPredictions({});
    setSavedPredictions(new Set());
    setKnockoutStageCounts({});
    lastAutoSyncHash.current = "";
    setResetting(false);
    setMessage("כל הניחושים אופסו");
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
                    ? `${Math.round((savedPredictions.size / matches.length) * 100)}%`
                    : "0%",
              }}
            />
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {savedPredictions.size} / {matches.length} ניחושים
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
        {showInstructions ? (
          <button
            onClick={() => setShowInstructions(false)}
            className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap border-b-2 border-transparent"
          >
            תוצאות משחקים
          </button>
        ) : (
          <span className="px-3 py-2 text-sm text-white font-semibold whitespace-nowrap border-b-2 border-yellow-400">
            תוצאות משחקים
          </span>
        )}
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
        <button
          onClick={() => setShowInstructions(true)}
          className={`px-3 py-2 text-sm transition-colors whitespace-nowrap border-b-2 ${
            showInstructions
              ? "text-white font-semibold border-yellow-400"
              : "text-gray-400 hover:text-white border-transparent"
          }`}
        >
          הוראות
        </button>
      </div>

      {showInstructions ? (
        <InstructionsContent matchRules={scoringRules} maxVersions={maxVersions} />
      ) : (
        <>
          {/* Stage tabs */}
          <div className="flex gap-2 flex-wrap mb-6">
            {stages.map((stage) => {
              const stageSavedCount = (stageMatchIds[stage] ?? []).filter((id) => savedPredictions.has(id)).length;
              const hasKnockoutPicks = (knockoutStageCounts[stage] ?? 0) > 0;
              const hasAnythingToReset = stageSavedCount > 0 || hasKnockoutPicks;
              return (
                <div key={stage} className="flex items-center gap-0.5">
                  <button
                    onClick={() => setActiveStage(stage)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeStage === stage
                        ? "bg-green-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {STAGE_LABELS[stage] ?? stage}
                    {stageSavedCount > 0 && (
                      <span className="mr-1.5 text-xs opacity-70">({stageSavedCount})</span>
                    )}
                  </button>
                  {!versionLocked && hasAnythingToReset && (
                    <button
                      onClick={() => handleResetStage(stage)}
                      disabled={resetting}
                      title={`אפס ${STAGE_LABELS[stage] ?? stage}`}
                      className={`px-1.5 py-1.5 rounded-lg text-xs transition-colors ${
                        activeStage === stage
                          ? "bg-green-700 hover:bg-red-700 text-white"
                          : "bg-gray-700 hover:bg-red-700 text-gray-400 hover:text-white"
                      }`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Group-stage display toggle */}
          {activeStage === "GROUP" && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs text-gray-400">תצוגה:</span>
              <button
                type="button"
                onClick={() => setGroupViewMode("groups")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  groupViewMode === "groups"
                    ? "bg-green-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                לפי בתים
              </button>
              <button
                type="button"
                onClick={() => setGroupViewMode("dates")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  groupViewMode === "dates"
                    ? "bg-green-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                לפי תאריכים
              </button>
            </div>
          )}

          {/* Matches */}
          <div className="space-y-2">
            {activeStage !== "GROUP" &&
              visibleMatches.map((match) => {
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

            {activeStage === "GROUP" && groupViewMode === "groups" &&
              groupSections.map((section) => (
                <section key={section.groupName} className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center font-bold text-white text-xs">
                      {section.groupName}
                    </div>
                    <h3 className="text-sm font-semibold text-white">בית {section.groupName}</h3>
                    <div className="flex-1 h-px bg-gray-800" />
                  </div>
                  <div className="space-y-2">
                    {section.matches.map((match) => {
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
                </section>
              ))}

            {activeStage === "GROUP" && groupViewMode === "dates" &&
              dateSections.map((section) => (
                <section key={section.dateLabel} className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-blue-300">{section.dateLabel}</h3>
                    <div className="flex-1 h-px bg-gray-800" />
                  </div>
                  <div className="space-y-2">
                    {section.matches.map((match) => {
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
                </section>
              ))}
          </div>

          {/* Save + Reset buttons */}
          {!versionLocked && (
            <div className="mt-6 flex items-center gap-3 flex-wrap">
              <button
                onClick={handleSave}
                disabled={saving || resetting}
                className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
              >
                {saving ? "שומר..." : "שמור ניחושים"}
              </button>
              {savedPredictions.size > 0 && (
                <button
                  onClick={handleResetAll}
                  disabled={saving || resetting}
                  className="bg-gray-800 hover:bg-red-900 disabled:opacity-50 text-gray-300 hover:text-red-300 border border-gray-700 hover:border-red-700 font-medium px-4 py-2.5 rounded-xl transition-colors text-sm"
                >
                  {resetting ? "מאפס..." : `אפס הכל (${savedPredictions.size})`}
                </button>
              )}
              {message && <span className="text-sm text-gray-400">{message}</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
