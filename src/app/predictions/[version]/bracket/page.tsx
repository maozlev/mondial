"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getFlagUrl } from "@/lib/flags";

// ─── 2026 WC Official Bracket Structure ───────────────────────────────────────
// Maps each QF match (1-4) to the group positions that can reach it:
//   QF1 (M97): 1st from E,F,I  |  2nd from A,B,C  (+3rd wildcards)
//   QF2 (M98): 1st from D,G,H  |  2nd from J,K,L  (+3rd wildcards)
//   QF3 (M99): 1st from A,C,L  |  2nd from E,F,I  (+3rd wildcards)
//   QF4 (M100): 1st from B,J,K |  2nd from D,G,H  (+3rd wildcards)
// SF1 = winner(QF1) vs winner(QF2)  →  left finalist
// SF2 = winner(QF3) vs winner(QF4)  →  right finalist
//
// R16 matches feed QF slots directly:
//   R16 m0 (rank1 E,F,I)  → picks.qf[0] = QF1 teamA
//   R16 m1 (rank2 A,B,C)  → picks.qf[1] = QF1 teamB
//   R16 m2 (rank1 D,G,H)  → picks.qf[2] = QF2 teamA
//   R16 m3 (rank2 J,K,L)  → picks.qf[3] = QF2 teamB
//   R16 m4 (rank1 A,C,L)  → picks.qf[4] = QF3 teamA
//   R16 m5 (rank2 E,F,I)  → picks.qf[5] = QF3 teamB
//   R16 m6 (rank1 B,J,K)  → picks.qf[6] = QF4 teamA
//   R16 m7 (rank2 D,G,H)  → picks.qf[7] = QF4 teamB

const QF_INFO = [
  { id: 1, label: "רבע גמר 1", rank1Groups: ["E","F","I"], rank2Groups: ["A","B","C"] },
  { id: 2, label: "רבע גמר 2", rank1Groups: ["D","G","H"], rank2Groups: ["J","K","L"] },
  { id: 3, label: "רבע גמר 3", rank1Groups: ["A","C","L"], rank2Groups: ["E","F","I"] },
  { id: 4, label: "רבע גמר 4", rank1Groups: ["B","J","K"], rank2Groups: ["D","G","H"] },
] as const;

type StandingPred = {
  groupName: string; rank1: string; rank2: string; rank3: string; rank4: string;
};
type KnockoutRow = { stage: string; slot: number; teamName: string };

type Picks = {
  r16: string[];    // 16 slots: pairs [m0a, m0b, m1a, m1b, ..., m7a, m7b]
  qf: string[];     // 8 slots: R16 winners (QF participants)
  sf: string[];     // 4 slots: QF winners (SF participants)
  final: string[];  // 2 slots: SF winners (Final participants)
  winner: string;
};

function emptyPicks(): Picks {
  return {
    r16: Array(16).fill(""),
    qf: Array(8).fill(""),
    sf: Array(4).fill(""),
    final: Array(2).fill(""),
    winner: "",
  };
}

function addThirds(teams: string[], allThirds: string[]): string[] {
  for (const t of allThirds) { if (!teams.includes(t)) teams.push(t); }
  return teams.filter(Boolean);
}

/** Candidates for R16 match r16Idx: rank1/rank2 of specific groups + thirds wildcards */
function getCandidatesForR16(r16Idx: number, standings: StandingPred[], allThirds: string[]): string[] {
  const qfMatchIdx = Math.floor(r16Idx / 2);
  const side = r16Idx % 2; // 0 = rank1Groups, 1 = rank2Groups
  const info = QF_INFO[qfMatchIdx];
  const groups = (side === 0 ? info.rank1Groups : info.rank2Groups) as readonly string[];
  const teams: string[] = [];
  for (const s of standings) {
    if (groups.includes(s.groupName)) {
      const team = side === 0 ? s.rank1 : s.rank2;
      if (team) teams.push(team);
    }
  }
  return addThirds(teams, allThirds);
}

function getR16Label(r16Idx: number): string {
  return `שמינית גמר ${r16Idx + 1}`;
}

function getR16Groups(r16Idx: number): string[] {
  const qfMatchIdx = Math.floor(r16Idx / 2);
  const side = r16Idx % 2;
  const info = QF_INFO[qfMatchIdx];
  return [...(side === 0 ? info.rank1Groups : info.rank2Groups)];
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function TeamBadge({
  team, onClick, winner, locked,
}: {
  team: string; onClick?: () => void; winner?: boolean; locked?: boolean;
}) {
  const flag = team ? getFlagUrl(team) : "";
  return (
    <button
      type="button"
      onClick={locked ? undefined : onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium w-full
        transition-all duration-150 border
        ${winner
          ? "bg-yellow-500/20 border-yellow-400 text-yellow-300 ring-1 ring-yellow-400"
          : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white"
        }
        ${locked ? "cursor-default" : "cursor-pointer"}
      `}
    >
      {flag
        ? <img src={flag} alt={team} className="w-6 h-4 object-cover rounded-sm flex-shrink-0" />
        : <div className="w-6 h-4 rounded-sm bg-gray-700 flex-shrink-0" />
      }
      <span className="truncate flex-1 text-left">{team || "—"}</span>
      {winner && <span className="text-yellow-400 text-xs flex-shrink-0">✓</span>}
    </button>
  );
}

function TeamSelect({
  value, onChange, options, locked,
}: {
  value: string; onChange: (v: string) => void; options: string[]; locked: boolean;
}) {
  const flag = value ? getFlagUrl(value) : "";
  if (locked) {
    return (
      <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
        {flag
          ? <img src={flag} alt={value} className="w-6 h-4 object-cover rounded-sm flex-shrink-0" />
          : <div className="w-6 h-4 rounded-sm bg-gray-700 flex-shrink-0" />
        }
        <span className="text-white truncate">{value || "—"}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
      {flag
        ? <img src={flag} alt={value} className="w-6 h-4 object-cover rounded-sm flex-shrink-0" />
        : <div className="w-6 h-4 rounded-sm bg-gray-700 flex-shrink-0" />
      }
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-gray-800 text-sm text-white focus:outline-none cursor-pointer"
      >
        <option value="">— בחר —</option>
        {options.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function BracketPage() {
  const { version } = useParams<{ version: string }>();
  const versionNum = parseInt(version, 10);

  const [picks, setPicks] = useState<Picks>(emptyPicks());
  const [standings, setStandings] = useState<StandingPred[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [locked, setLocked] = useState(false);
  const [deadline, setDeadline] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((s: Record<string, string>) => {
        const globalLocked = s["predictions_locked"] === "true";
        const dl = s[`version_${versionNum}_deadline`] ?? null;
        const pastDeadline = dl ? new Date() > new Date(dl) : false;
        setLocked(globalLocked || pastDeadline);
        setDeadline(dl);
      });

    fetch(`/api/predictions/${versionNum}/standings`)
      .then((r) => r.json())
      .then((data: StandingPred[]) => { if (Array.isArray(data)) setStandings(data); });

    fetch(`/api/predictions/${versionNum}/knockout`)
      .then((r) => r.json())
      .then((data: KnockoutRow[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        const next = emptyPicks();
        for (const row of data) {
          if (row.stage === "R16" && row.slot >= 1 && row.slot <= 16) next.r16[row.slot - 1] = row.teamName;
          else if (row.stage === "QF" && row.slot >= 1 && row.slot <= 8) next.qf[row.slot - 1] = row.teamName;
          else if (row.stage === "SF" && row.slot >= 1 && row.slot <= 4) next.sf[row.slot - 1] = row.teamName;
          else if (row.stage === "FINAL" && row.slot >= 1 && row.slot <= 2) next.final[row.slot - 1] = row.teamName;
          else if (row.stage === "WINNER" && row.slot === 1) next.winner = row.teamName;
        }
        setPicks(next);
      });
  }, [versionNum]);

  const allThirds = standings.map((s) => s.rank3).filter(Boolean);
  const r16Cands = (r16Idx: number) => getCandidatesForR16(r16Idx, standings, allThirds);

  function setR16Team(r16MatchIdx: number, side: 0 | 1, team: string) {
    setPicks((prev) => {
      const next = { ...prev, r16: [...prev.r16] };
      const oldTeam = prev.r16[r16MatchIdx * 2 + side];
      next.r16[r16MatchIdx * 2 + side] = team;
      // If old team was the R16 winner, clear QF slot and downstream
      if (prev.qf[r16MatchIdx] === oldTeam) {
        next.qf = [...prev.qf]; next.qf[r16MatchIdx] = "";
        const qfMatchIdx = Math.floor(r16MatchIdx / 2);
        if (prev.sf[qfMatchIdx] === oldTeam) {
          next.sf = [...prev.sf]; next.sf[qfMatchIdx] = "";
          const fIdx = qfMatchIdx <= 1 ? 0 : 1;
          if (prev.final[fIdx] === oldTeam) {
            next.final = [...prev.final]; next.final[fIdx] = "";
            if (prev.winner === oldTeam) next.winner = "";
          }
        }
      }
      return next;
    });
  }

  function pickR16Winner(r16MatchIdx: number, team: string) {
    setPicks((prev) => {
      const next = { ...prev, qf: [...prev.qf] };
      const old = prev.qf[r16MatchIdx];
      next.qf[r16MatchIdx] = team;
      const qfMatchIdx = Math.floor(r16MatchIdx / 2);
      if (old && prev.sf[qfMatchIdx] === old) {
        next.sf = [...prev.sf]; next.sf[qfMatchIdx] = "";
        const fIdx = qfMatchIdx <= 1 ? 0 : 1;
        if (prev.final[fIdx] === old) {
          next.final = [...prev.final]; next.final[fIdx] = "";
          if (prev.winner === old) next.winner = "";
        }
      }
      return next;
    });
  }

  function pickQFWinner(qfMatchIdx: number, team: string) {
    setPicks((prev) => {
      const next = { ...prev, sf: [...prev.sf] };
      const old = prev.sf[qfMatchIdx];
      next.sf[qfMatchIdx] = team;
      const fIdx = qfMatchIdx <= 1 ? 0 : 1;
      if (old && prev.final[fIdx] === old) {
        next.final = [...prev.final]; next.final[fIdx] = "";
        if (prev.winner === old) next.winner = "";
      }
      return next;
    });
  }

  function pickSFWinner(sfIdx: number, team: string) {
    setPicks((prev) => {
      const next = { ...prev, final: [...prev.final] };
      const old = prev.final[sfIdx];
      next.final[sfIdx] = team;
      if (old && prev.winner === old) next.winner = "";
      return next;
    });
  }

  const handleSave = async () => {
    setSaving(true); setMessage("");
    const payload: KnockoutRow[] = [];
    picks.r16.forEach((t, i) => { if (t) payload.push({ stage: "R16", slot: i + 1, teamName: t }); });
    picks.qf.forEach((t, i) => { if (t) payload.push({ stage: "QF", slot: i + 1, teamName: t }); });
    picks.sf.forEach((t, i) => { if (t) payload.push({ stage: "SF", slot: i + 1, teamName: t }); });
    picks.final.forEach((t, i) => { if (t) payload.push({ stage: "FINAL", slot: i + 1, teamName: t }); });
    if (picks.winner) payload.push({ stage: "WINNER", slot: 1, teamName: picks.winner });

    const res = await fetch(`/api/predictions/${versionNum}/knockout`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ picks: payload }),
    });
    setSaving(false);
    if (res.ok) setMessage("✓ הברקט נשמר!");
    else { const err = await res.json(); setMessage(err.error ?? "שגיאה בשמירה"); }
  };

  const deadlineLabel = deadline
    ? new Date(deadline).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })
    : null;

  return (
    <div className="max-w-7xl mx-auto px-3 py-6" dir="rtl">
      {/* Sub-nav */}
      <div className="flex gap-1 mb-6 border-b border-gray-800 pb-0 overflow-x-auto">
        <Link href={`/predictions/${versionNum}`} className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap border-b-2 border-transparent">
          תוצאות משחקים
        </Link>
        <Link href={`/predictions/${versionNum}/standings`} className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap border-b-2 border-transparent">
          עמדות קבוצות
        </Link>
        <span className="px-3 py-2 text-sm text-white font-semibold whitespace-nowrap border-b-2 border-yellow-400">ברקט</span>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">ברקט — גרסה {versionNum}</h1>
          <p className="text-gray-400 text-sm">ניחוש שלב הנוקאאוט לפי עמדות הבתים</p>
        </div>
        {deadlineLabel && <p className="text-xs text-gray-500">דד-ליין: {deadlineLabel}</p>}
      </div>

      {locked && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm mb-4">
          🔒 הגרסה נעולה — לא ניתן לשנות ניחושים
        </div>
      )}

      {standings.length === 0 && (
        <div className="bg-blue-900/40 border border-blue-700 text-blue-300 rounded-lg px-4 py-3 text-sm mb-4">
          💡 מלא קודם את{" "}
          <Link href={`/predictions/${versionNum}/standings`} className="underline text-blue-200">
            עמדות הקבוצות
          </Link>{" "}
          — הברקט יציג אוטומטית את הקבוצות לפי הבית שלהן
        </div>
      )}

      {message && (
        <p className={`text-sm mb-4 ${message.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{message}</p>
      )}

      {/* ─── Mobile stacked layout ───────────────────────────────────────── */}
      <div className="md:hidden space-y-6 pb-4">

        {/* R16 matches */}
        <div>
          <ColHeader>שמינית גמר</ColHeader>
          <div className="mt-2 space-y-3">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((r16Idx) => (
              <R16Card
                key={r16Idx}
                label={getR16Label(r16Idx)}
                groups={getR16Groups(r16Idx)}
                teamA={picks.r16[r16Idx * 2]}
                teamB={picks.r16[r16Idx * 2 + 1]}
                candidates={r16Cands(r16Idx)}
                qfTeam={picks.qf[r16Idx]}
                locked={locked}
                onChangeA={(t) => setR16Team(r16Idx, 0, t)}
                onChangeB={(t) => setR16Team(r16Idx, 1, t)}
                onPickWinner={(t) => pickR16Winner(r16Idx, t)}
              />
            ))}
          </div>
        </div>

        {/* QF matches */}
        <div>
          <ColHeader>רבע גמר</ColHeader>
          <div className="mt-2 space-y-3">
            {[0, 1, 2, 3].map((qfIdx) => (
              <QFCard
                key={qfIdx}
                label={`רבע גמר ${qfIdx + 1}`}
                teamA={picks.qf[qfIdx * 2]}
                teamB={picks.qf[qfIdx * 2 + 1]}
                sfTeam={picks.sf[qfIdx]}
                locked={locked}
                onPickWinner={(t) => pickQFWinner(qfIdx, t)}
              />
            ))}
          </div>
        </div>

        {/* SF matches */}
        <div>
          <ColHeader>חצי גמר</ColHeader>
          <div className="mt-2 space-y-3">
            {([
              { label: "חצי גמר 1", teamA: picks.sf[0], teamB: picks.sf[1], finalWinner: picks.final[0], sfIdx: 0 },
              { label: "חצי גמר 2", teamA: picks.sf[2], teamB: picks.sf[3], finalWinner: picks.final[1], sfIdx: 1 },
            ] as const).map(({ label, teamA, teamB, finalWinner, sfIdx }) => (
              <SFCard key={sfIdx} label={label} teamA={teamA} teamB={teamB} finalWinner={finalWinner} locked={locked} onPickWinner={(t) => pickSFWinner(sfIdx, t)} />
            ))}
          </div>
        </div>

        {/* Final */}
        <div>
          <ColHeader>גמר</ColHeader>
          <div className="mt-2">
            <FinalCard
              teamA={picks.final[0]} teamB={picks.final[1]}
              winner={picks.winner} locked={locked}
              onPickWinner={(t) => setPicks((p) => ({ ...p, winner: t }))}
            />
          </div>
        </div>
      </div>

      {/* ─── Desktop Bracket ─────────────────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto -mx-3 px-3 pb-4">
        <div className="flex gap-2 min-w-[1120px] items-stretch" dir="ltr">

          {/* R16 Left column (matches 0–3, feeding QF1 and QF2) */}
          <div className="flex flex-col gap-2 flex-1 min-w-[150px]">
            <ColHeader>שמינית גמר</ColHeader>
            {[0, 1, 2, 3].map((r16Idx) => (
              <React.Fragment key={r16Idx}>
                <R16Card
                  label={getR16Label(r16Idx)}
                  groups={getR16Groups(r16Idx)}
                  teamA={picks.r16[r16Idx * 2]}
                  teamB={picks.r16[r16Idx * 2 + 1]}
                  candidates={r16Cands(r16Idx)}
                  qfTeam={picks.qf[r16Idx]}
                  locked={locked}
                  onChangeA={(t) => setR16Team(r16Idx, 0, t)}
                  onChangeB={(t) => setR16Team(r16Idx, 1, t)}
                  onPickWinner={(t) => pickR16Winner(r16Idx, t)}
                />
                {r16Idx === 1 && <div className="flex-1 min-h-2" />}
              </React.Fragment>
            ))}
          </div>

          {/* QF Left column (QF1 and QF2) */}
          <div className="flex flex-col gap-3 flex-1 min-w-[150px]">
            <ColHeader>רבע גמר</ColHeader>
            <QFCard
              label="רבע גמר 1"
              teamA={picks.qf[0]} teamB={picks.qf[1]}
              sfTeam={picks.sf[0]} locked={locked}
              onPickWinner={(t) => pickQFWinner(0, t)}
            />
            <div className="flex-1 min-h-4" />
            <QFCard
              label="רבע גמר 2"
              teamA={picks.qf[2]} teamB={picks.qf[3]}
              sfTeam={picks.sf[1]} locked={locked}
              onPickWinner={(t) => pickQFWinner(1, t)}
            />
          </div>

          {/* Left SF column */}
          <div className="flex flex-col justify-center min-w-[155px]">
            <div className="mb-6" />
            <ColHeader>חצי גמר</ColHeader>
            <SFCard
              label="חצי גמר 1"
              teamA={picks.sf[0]} teamB={picks.sf[1]}
              finalWinner={picks.final[0]} locked={locked}
              onPickWinner={(t) => pickSFWinner(0, t)}
            />
          </div>

          {/* Final + Winner column */}
          <div className="flex flex-col justify-center min-w-[145px]">
            <div className="mb-12" />
            <ColHeader>גמר</ColHeader>
            <FinalCard
              teamA={picks.final[0]} teamB={picks.final[1]}
              winner={picks.winner} locked={locked}
              onPickWinner={(t) => setPicks((p) => ({ ...p, winner: t }))}
            />
          </div>

          {/* Right SF column */}
          <div className="flex flex-col justify-center min-w-[155px]">
            <div className="mb-6" />
            <ColHeader>חצי גמר</ColHeader>
            <SFCard
              label="חצי גמר 2"
              teamA={picks.sf[2]} teamB={picks.sf[3]}
              finalWinner={picks.final[1]} locked={locked}
              onPickWinner={(t) => pickSFWinner(1, t)}
            />
          </div>

          {/* QF Right column (QF3 and QF4) */}
          <div className="flex flex-col gap-3 flex-1 min-w-[150px]">
            <ColHeader>רבע גמר</ColHeader>
            <QFCard
              label="רבע גמר 3"
              teamA={picks.qf[4]} teamB={picks.qf[5]}
              sfTeam={picks.sf[2]} locked={locked}
              onPickWinner={(t) => pickQFWinner(2, t)}
            />
            <div className="flex-1 min-h-4" />
            <QFCard
              label="רבע גמר 4"
              teamA={picks.qf[6]} teamB={picks.qf[7]}
              sfTeam={picks.sf[3]} locked={locked}
              onPickWinner={(t) => pickQFWinner(3, t)}
            />
          </div>

          {/* R16 Right column (matches 4–7, feeding QF3 and QF4) */}
          <div className="flex flex-col gap-2 flex-1 min-w-[150px]">
            <ColHeader>שמינית גמר</ColHeader>
            {[4, 5, 6, 7].map((r16Idx) => (
              <React.Fragment key={r16Idx}>
                <R16Card
                  label={getR16Label(r16Idx)}
                  groups={getR16Groups(r16Idx)}
                  teamA={picks.r16[r16Idx * 2]}
                  teamB={picks.r16[r16Idx * 2 + 1]}
                  candidates={r16Cands(r16Idx)}
                  qfTeam={picks.qf[r16Idx]}
                  locked={locked}
                  onChangeA={(t) => setR16Team(r16Idx, 0, t)}
                  onChangeB={(t) => setR16Team(r16Idx, 1, t)}
                  onPickWinner={(t) => pickR16Winner(r16Idx, t)}
                />
                {r16Idx === 5 && <div className="flex-1 min-h-2" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {!locked && (
        <div className="flex justify-center mt-6">
          <button
            onClick={handleSave} disabled={saving}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold px-8 py-2 rounded-lg transition-colors"
          >
            {saving ? "שומר..." : "שמור ברקט"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Column header ─────────────────────────────────────────────────────────────

function ColHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center text-xs font-bold text-yellow-400 uppercase tracking-wide py-1 border-b border-gray-800 mb-1">
      {children}
    </div>
  );
}

// ─── R16 Match Card ────────────────────────────────────────────────────────────

function R16Card({
  label, groups, teamA, teamB, candidates, qfTeam, locked,
  onChangeA, onChangeB, onPickWinner,
}: {
  label: string; groups: string[]; teamA: string; teamB: string;
  candidates: string[]; qfTeam: string; locked: boolean;
  onChangeA: (t: string) => void; onChangeB: (t: string) => void;
  onPickWinner: (t: string) => void;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-2">
      <div className="text-xs text-gray-400 font-medium">{label}</div>
      <div className="text-xs text-gray-600">בתים: {groups.join(", ")}</div>
      <TeamSelect value={teamA} onChange={onChangeA} options={candidates} locked={locked} />
      <div className="text-center text-xs text-gray-600 font-bold">VS</div>
      <TeamSelect value={teamB} onChange={onChangeB} options={candidates} locked={locked} />
      {(teamA || teamB) && (
        <div className="pt-1 border-t border-gray-800 space-y-1">
          <div className="text-xs text-gray-500 text-center">→ מי עולה לרבע גמר?</div>
          {teamA && <TeamBadge team={teamA} winner={qfTeam === teamA} locked={locked} onClick={() => onPickWinner(teamA)} />}
          {teamB && <TeamBadge team={teamB} winner={qfTeam === teamB} locked={locked} onClick={() => onPickWinner(teamB)} />}
        </div>
      )}
    </div>
  );
}

// ─── QF Match Card ─────────────────────────────────────────────────────────────

function QFCard({
  label, teamA, teamB, sfTeam, locked, onPickWinner,
}: {
  label: string; teamA: string; teamB: string;
  sfTeam: string; locked: boolean; onPickWinner: (t: string) => void;
}) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 space-y-2">
      <div className="text-xs text-gray-400 font-medium">{label}</div>
      {!teamA && !teamB ? (
        <div className="text-xs text-gray-600 italic py-3 text-center">ממתין לשמינית גמר</div>
      ) : (
        <>
          {teamA
            ? <TeamBadge team={teamA} winner={sfTeam === teamA} locked={locked} onClick={() => onPickWinner(teamA)} />
            : <div className="h-9 bg-gray-800 rounded-lg border border-dashed border-gray-700" />
          }
          <div className="text-center text-xs text-gray-600 font-bold">VS</div>
          {teamB
            ? <TeamBadge team={teamB} winner={sfTeam === teamB} locked={locked} onClick={() => onPickWinner(teamB)} />
            : <div className="h-9 bg-gray-800 rounded-lg border border-dashed border-gray-700" />
          }
        </>
      )}
    </div>
  );
}

// ─── SF Match Card ─────────────────────────────────────────────────────────────

function SFCard({
  label, teamA, teamB, finalWinner, locked, onPickWinner,
}: {
  label: string; teamA: string; teamB: string;
  finalWinner: string; locked: boolean; onPickWinner: (t: string) => void;
}) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 space-y-2">
      <div className="text-xs text-gray-400 font-medium">{label}</div>
      {!teamA && !teamB ? (
        <div className="text-xs text-gray-600 italic py-3 text-center">ממתין לרבע גמר</div>
      ) : (
        <>
          {teamA
            ? <TeamBadge team={teamA} winner={finalWinner === teamA} locked={locked} onClick={() => onPickWinner(teamA)} />
            : <div className="h-9 bg-gray-800 rounded-lg border border-dashed border-gray-700" />
          }
          <div className="text-center text-xs text-gray-600 font-bold">VS</div>
          {teamB
            ? <TeamBadge team={teamB} winner={finalWinner === teamB} locked={locked} onClick={() => onPickWinner(teamB)} />
            : <div className="h-9 bg-gray-800 rounded-lg border border-dashed border-gray-700" />
          }
        </>
      )}
    </div>
  );
}

// ─── Final Card ────────────────────────────────────────────────────────────────

function FinalCard({
  teamA, teamB, winner, locked, onPickWinner,
}: {
  teamA: string; teamB: string; winner: string; locked: boolean; onPickWinner: (t: string) => void;
}) {
  return (
    <div className="bg-gray-900 border border-yellow-800/40 rounded-xl p-3 space-y-2">
      <div className="text-xs text-yellow-400 font-bold text-center">🏆 גמר</div>
      {!teamA && !teamB ? (
        <div className="text-xs text-gray-600 italic py-3 text-center">ממתין לחצי גמר</div>
      ) : (
        <>
          {teamA
            ? <TeamBadge team={teamA} winner={winner === teamA} locked={locked} onClick={() => onPickWinner(teamA)} />
            : <div className="h-9 bg-gray-800 rounded-lg border border-dashed border-gray-700" />
          }
          <div className="text-center text-xs text-gray-600 font-bold">VS</div>
          {teamB
            ? <TeamBadge team={teamB} winner={winner === teamB} locked={locked} onClick={() => onPickWinner(teamB)} />
            : <div className="h-9 bg-gray-800 rounded-lg border border-dashed border-gray-700" />
          }
          {winner && (
            <div className="pt-1 border-t border-yellow-800/40">
              <div className="text-xs text-yellow-400 text-center mb-1">🥇 האלוף</div>
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
                {getFlagUrl(winner) && (
                  <img src={getFlagUrl(winner)} alt={winner} className="w-6 h-4 object-cover rounded-sm flex-shrink-0" />
                )}
                <span className="text-yellow-300 font-bold text-sm">{winner}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

