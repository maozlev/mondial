"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getFlagUrl } from "@/lib/flags";
import { COUNTRY_CODES } from "@/lib/flags";

const ALL_TEAMS = Object.keys(COUNTRY_CODES);

type Stage = "QF" | "SF" | "FINAL" | "WINNER";

// slot counts per stage
const STAGE_SLOTS: Record<Stage, number> = {
  QF: 8,
  SF: 4,
  FINAL: 2,
  WINNER: 1,
};

const STAGE_LABELS: Record<Stage, string> = {
  QF: "רבע גמר",
  SF: "חצי גמר",
  FINAL: "גמר",
  WINNER: "אלוף",
};

type Picks = Record<Stage, string[]>;

function emptyPicks(): Picks {
  return {
    QF: Array(8).fill(""),
    SF: Array(4).fill(""),
    FINAL: Array(2).fill(""),
    WINNER: Array(1).fill(""),
  };
}

function TeamSelect({
  value,
  onChange,
  options,
  locked,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  locked: boolean;
  placeholder: string;
}) {
  const flagUrl = value ? getFlagUrl(value) : "";
  return (
    <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 min-w-0">
      {flagUrl ? (
        <img
          src={flagUrl}
          alt={value}
          className="w-6 h-4 object-cover rounded-sm flex-shrink-0"
        />
      ) : (
        <div className="w-6 h-4 flex-shrink-0 rounded-sm bg-gray-700" />
      )}
      {locked ? (
        <span className="text-sm text-white flex-1 truncate">
          {value || <span className="text-gray-500">{placeholder}</span>}
        </span>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-gray-800 text-sm text-white focus:outline-none cursor-pointer"
        >
          <option value="">{placeholder}</option>
          {options.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export default function BracketPage() {
  const { version } = useParams<{ version: string }>();
  const versionNum = parseInt(version, 10);

  const [picks, setPicks] = useState<Picks>(emptyPicks());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [versionLocked, setVersionLocked] = useState(false);
  const [deadline, setDeadline] = useState<string | null>(null);

  useEffect(() => {
    // Load settings
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((s: Record<string, string>) => {
        const globalLocked = s["predictions_locked"] === "true";
        const dl = s[`version_${versionNum}_deadline`] ?? null;
        const pastDeadline = dl ? new Date() > new Date(dl) : false;
        setVersionLocked(globalLocked || pastDeadline);
        setDeadline(dl);
      });

    // Load existing picks
    fetch(`/api/predictions/${versionNum}/knockout`)
      .then((r) => r.json())
      .then(
        (
          data: { stage: Stage; slot: number; teamName: string }[]
        ) => {
          if (!Array.isArray(data) || data.length === 0) return;
          const next = emptyPicks();
          for (const row of data) {
            const arr = next[row.stage];
            if (arr && row.slot >= 1 && row.slot <= arr.length) {
              arr[row.slot - 1] = row.teamName;
            }
          }
          setPicks(next);
        }
      );
  }, [versionNum]);

  function setSlot(stage: Stage, idx: number, team: string) {
    setPicks((prev) => {
      const next = { ...prev, [stage]: [...prev[stage]] };
      next[stage][idx] = team;

      // Cascade: if a team is cleared or changed, remove it from downstream stages
      const stageOrder: Stage[] = ["QF", "SF", "FINAL", "WINNER"];
      const stageIdx = stageOrder.indexOf(stage);
      const downstreamStages = stageOrder.slice(stageIdx + 1);

      for (const ds of downstreamStages) {
        // Get the valid teams for ds: union of teams in the immediately preceding stage
        const prevStage = stageOrder[stageOrder.indexOf(ds) - 1];
        const validTeams = new Set(next[prevStage].filter(Boolean));
        next[ds] = next[ds].map((t) => (validTeams.has(t) ? t : ""));
      }

      return next;
    });
  }

  // Compute options for each stage (must be selected in prior stage)
  function optionsFor(stage: Stage): string[] {
    const stageOrder: Stage[] = ["QF", "SF", "FINAL", "WINNER"];
    const idx = stageOrder.indexOf(stage);
    if (idx === 0) return ALL_TEAMS;
    const prevStage = stageOrder[idx - 1];
    return picks[prevStage].filter(Boolean);
  }

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    const stageOrder: Stage[] = ["QF", "SF", "FINAL", "WINNER"];
    const pickPayload: { stage: Stage; slot: number; teamName: string }[] = [];
    for (const stage of stageOrder) {
      picks[stage].forEach((team, idx) => {
        if (team) {
          pickPayload.push({ stage, slot: idx + 1, teamName: team });
        }
      });
    }

    const res = await fetch(`/api/predictions/${versionNum}/knockout`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ picks: pickPayload }),
    });
    setSaving(false);

    if (res.ok) {
      setMessage("✓ הברקט נשמר!");
    } else {
      const err = await res.json();
      setMessage(err.error ?? "שגיאה בשמירה");
    }
  };

  const deadlineLabel = deadline
    ? new Date(deadline).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })
    : null;

  const stages: Stage[] = ["QF", "SF", "FINAL", "WINNER"];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Sub-nav */}
      <div className="flex gap-1 mb-6 border-b border-gray-800 pb-0 overflow-x-auto">
        <Link
          href={`/predictions/${versionNum}`}
          className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap border-b-2 border-transparent"
        >
          תוצאות משחקים
        </Link>
        <Link
          href={`/predictions/${versionNum}/standings`}
          className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap border-b-2 border-transparent"
        >
          עמדות קבוצות
        </Link>
        <span className="px-3 py-2 text-sm text-white font-semibold whitespace-nowrap border-b-2 border-yellow-400">
          ברקט
        </span>
      </div>

      <h1 className="text-xl font-bold text-white mb-1">
        ברקט — גרסה {versionNum}
      </h1>
      <p className="text-gray-400 text-sm mb-4">
        בחר את הקבוצות שיגיעו לכל שלב (בחירות מתוך שלב קודם בלבד)
      </p>

      {deadlineLabel && (
        <p className="text-xs text-gray-500 mb-4">דד-ליין: {deadlineLabel}</p>
      )}

      {versionLocked && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm mb-4">
          🔒 הגרסה נעולה — לא ניתן לשנות ניחושים
        </div>
      )}

      {message && (
        <p
          className={`text-sm mb-4 ${
            message.startsWith("✓") ? "text-green-400" : "text-red-400"
          }`}
        >
          {message}
        </p>
      )}

      {/* Bracket columns — horizontal scroll on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 mb-8">
        <div className="flex gap-3 min-w-[640px]">
          {stages.map((stage) => (
            <div key={stage} className="flex flex-col gap-2 flex-1 min-w-[140px]">
              <h2 className="text-xs font-bold text-yellow-400 text-center uppercase tracking-wide pb-1 border-b border-gray-800">
                {STAGE_LABELS[stage]}
              </h2>
              {Array.from({ length: STAGE_SLOTS[stage] }).map((_, idx) => (
                <TeamSelect
                  key={idx}
                  value={picks[stage][idx] ?? ""}
                  onChange={(v) => setSlot(stage, idx, v)}
                  options={optionsFor(stage)}
                  locked={versionLocked}
                  placeholder={`—`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {!versionLocked && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold px-6 py-2 rounded-lg transition-colors"
          >
            {saving ? "שומר..." : "שמור ברקט"}
          </button>
        </div>
      )}
    </div>
  );
}
