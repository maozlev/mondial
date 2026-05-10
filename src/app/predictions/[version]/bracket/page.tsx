"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getFlagUrl } from "@/lib/flags";

// ─── 2026 WC Official Bracket (FIFA M73-M88 → R32, M89-M96 → R16) ────────────

type R32SideDef =
  | { type: "rank1" | "rank2"; group: string }
  | { type: "rank3"; groups: string[] };

/**
 * 16 R32 match definitions, ordered M73=m0 … M88=m15.
 * Source: wikipedia.org/wiki/2026_FIFA_World_Cup
 */
const R32_MATCH_DEFS: { labelHe: string; sideA: R32SideDef; sideB: R32SideDef }[] = [
  { labelHe: "ס׳32 – 1",  sideA: { type: "rank2", group: "A" }, sideB: { type: "rank2", group: "B" } },               // M73
  { labelHe: "ס׳32 – 2",  sideA: { type: "rank1", group: "E" }, sideB: { type: "rank3", groups: ["A","B","C","D","F"] } }, // M74
  { labelHe: "ס׳32 – 3",  sideA: { type: "rank1", group: "F" }, sideB: { type: "rank2", group: "C" } },               // M75
  { labelHe: "ס׳32 – 4",  sideA: { type: "rank1", group: "C" }, sideB: { type: "rank2", group: "F" } },               // M76
  { labelHe: "ס׳32 – 5",  sideA: { type: "rank1", group: "I" }, sideB: { type: "rank3", groups: ["C","D","F","G","H"] } }, // M77
  { labelHe: "ס׳32 – 6",  sideA: { type: "rank2", group: "E" }, sideB: { type: "rank2", group: "I" } },               // M78
  { labelHe: "ס׳32 – 7",  sideA: { type: "rank1", group: "A" }, sideB: { type: "rank3", groups: ["C","E","F","H","I"] } }, // M79
  { labelHe: "ס׳32 – 8",  sideA: { type: "rank1", group: "L" }, sideB: { type: "rank3", groups: ["E","H","I","J","K"] } }, // M80
  { labelHe: "ס׳32 – 9",  sideA: { type: "rank1", group: "D" }, sideB: { type: "rank3", groups: ["B","E","F","I","J"] } }, // M81
  { labelHe: "ס׳32 – 10", sideA: { type: "rank1", group: "G" }, sideB: { type: "rank3", groups: ["A","E","H","I","J"] } }, // M82
  { labelHe: "ס׳32 – 11", sideA: { type: "rank2", group: "K" }, sideB: { type: "rank2", group: "L" } },               // M83
  { labelHe: "ס׳32 – 12", sideA: { type: "rank1", group: "H" }, sideB: { type: "rank2", group: "J" } },               // M84
  { labelHe: "ס׳32 – 13", sideA: { type: "rank1", group: "B" }, sideB: { type: "rank3", groups: ["E","F","G","I","J"] } }, // M85
  { labelHe: "ס׳32 – 14", sideA: { type: "rank1", group: "J" }, sideB: { type: "rank2", group: "H" } },               // M86
  { labelHe: "ס׳32 – 15", sideA: { type: "rank1", group: "K" }, sideB: { type: "rank3", groups: ["D","E","I","J","L"] } }, // M87
  { labelHe: "ס׳32 – 16", sideA: { type: "rank2", group: "D" }, sideB: { type: "rank2", group: "G" } },               // M88
];

/**
 * R32_TO_R16_SLOT[r32MatchIdx] = r16 array slot that the R32 winner fills.
 *   r16m0(M89): W_M74 vs W_M77 → r32[1]→r16[0], r32[4]→r16[1]
 *   r16m1(M90): W_M73 vs W_M75 → r32[0]→r16[2], r32[2]→r16[3]
 *   r16m2(M91): W_M76 vs W_M78 → r32[3]→r16[4], r32[5]→r16[5]
 *   r16m3(M92): W_M79 vs W_M80 → r32[6]→r16[6], r32[7]→r16[7]
 *   r16m4(M93): W_M83 vs W_M84 → r32[10]→r16[8], r32[11]→r16[9]
 *   r16m5(M94): W_M81 vs W_M82 → r32[8]→r16[10], r32[9]→r16[11]
 *   r16m6(M95): W_M86 vs W_M88 → r32[13]→r16[12], r32[15]→r16[13]
 *   r16m7(M96): W_M85 vs W_M87 → r32[12]→r16[14], r32[14]→r16[15]
 */
const R32_TO_R16_SLOT = [2, 0, 3, 4, 1, 5, 6, 7, 10, 11, 8, 9, 14, 12, 15, 13];

/**
 * R16_TO_QF_SLOT[r16MatchIdx] = qf array slot that the R16 winner fills.
 *   QFm0(M97): W_M89 vs W_M91 → r16m0→qf[0], r16m2→qf[1]
 *   QFm1(M98): W_M90 vs W_M92 → r16m1→qf[2], r16m3→qf[3]
 *   QFm2(M99): W_M93 vs W_M95 → r16m4→qf[4], r16m6→qf[5]
 *   QFm3(M100): W_M94 vs W_M96 → r16m5→qf[6], r16m7→qf[7]
 */
const R16_TO_QF_SLOT = [0, 2, 1, 3, 4, 6, 5, 7];

type StandingPred = {
  groupName: string; rank1: string; rank2: string; rank3: string; rank4: string;
};
type KnockoutRow = { stage: string; slot: number; teamName: string };

type Picks = {
  r32: string[];   // 32 slots: r32[matchIdx*2]=sideA, r32[matchIdx*2+1]=sideB
  r16: string[];   // 16 slots: filled from R32 winners
  qf: string[];    // 8 slots: filled from R16 winners
  sf: string[];    // 4 slots: filled from QF winners
  final: string[]; // 2 slots: filled from SF winners
  winner: string;
};

function emptyPicks(): Picks {
  return {
    r32: Array(32).fill(""),
    r16: Array(16).fill(""),
    qf: Array(8).fill(""),
    sf: Array(4).fill(""),
    final: Array(2).fill(""),
    winner: "",
  };
}

function getAutoTeam(side: R32SideDef, standings: StandingPred[]): string {
  if (side.type === "rank3") return "";
  const s = standings.find(st => st.groupName === side.group);
  if (!s) return "";
  return side.type === "rank1" ? s.rank1 : s.rank2;
}

function getRank3Candidates(groups: string[], standings: StandingPred[]): string[] {
  return standings.filter(s => groups.includes(s.groupName)).map(s => s.rank3).filter(Boolean);
}

function getSideLabel(side: R32SideDef): string {
  if (side.type === "rank1") return `1${side.group}`;
  if (side.type === "rank2") return `2${side.group}`;
  return `3rd (${(side as { type: "rank3"; groups: string[] }).groups.join("/")})`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center text-xs font-bold text-yellow-400 uppercase tracking-wide py-1 border-b border-gray-800 mb-1">
      {children}
    </div>
  );
}

function FlagImg({ team, className = "w-5 h-3.5" }: { team: string; className?: string }) {
  const url = getFlagUrl(team);
  return url
    ? <img src={url} alt={team} className={`${className} object-cover rounded-sm flex-shrink-0`} />
    : <div className={`${className} rounded-sm bg-gray-700 flex-shrink-0`} />;
}

function TeamBadge({
  team, winner, locked, onClick,
}: {
  team: string; winner?: boolean; locked?: boolean; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={locked ? undefined : onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium w-full transition-all border
        ${winner
          ? "bg-yellow-500/20 border-yellow-400 text-yellow-300 ring-1 ring-yellow-400"
          : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white"
        }
        ${locked ? "cursor-default" : "cursor-pointer"}
      `}
    >
      <FlagImg team={team} />
      <span className="truncate flex-1 text-left">{team || "—"}</span>
      {winner && <span className="text-yellow-400 text-xs flex-shrink-0">✓</span>}
    </button>
  );
}

function R32Card({
  label, sideALabel, sideBLabel, isThirdA, isThirdB,
  teamA, teamB, candidatesA, candidatesB, r16Team, locked,
  onChangeA, onChangeB, onPickWinner,
}: {
  label: string; sideALabel: string; sideBLabel: string;
  isThirdA: boolean; isThirdB: boolean;
  teamA: string; teamB: string;
  candidatesA: string[]; candidatesB: string[];
  r16Team: string; locked: boolean;
  onChangeA: (t: string) => void;
  onChangeB: (t: string) => void;
  onPickWinner: (t: string) => void;
}) {
  const winnerA = !!r16Team && r16Team === teamA;
  const winnerB = !!r16Team && r16Team === teamB;

  function renderSide(
    isThird: boolean, team: string, candidates: string[],
    sideLabel: string, isWinner: boolean, onChange: (t: string) => void
  ) {
    if (isThird) {
      return (
        <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs
          ${isWinner ? "border-yellow-400 bg-yellow-500/10" : "border-gray-700 bg-gray-800"}`}>
          <div className="w-5 h-3.5 flex-shrink-0">
            {team ? <FlagImg team={team} /> : <div className="w-5 h-3.5 rounded-sm bg-gray-700" />}
          </div>
          {locked ? (
            <span className="text-white truncate flex-1">{team || `— ${sideLabel} —`}</span>
          ) : (
            <select value={team} onChange={e => onChange(e.target.value)}
              className="flex-1 bg-transparent text-white focus:outline-none cursor-pointer">
              <option value="">— {sideLabel} —</option>
              {candidates.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
      );
    }
    return (
      <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs
        ${isWinner ? "border-yellow-400 bg-yellow-500/10 text-yellow-300" : "border-gray-700 bg-gray-800 text-gray-400"}`}>
        {team ? <FlagImg team={team} /> : <div className="w-5 h-3.5 rounded-sm bg-gray-700 flex-shrink-0" />}
        <span className="truncate">{team || <span className="italic text-gray-600">{sideLabel}</span>}</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-2">
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      {renderSide(isThirdA, teamA, candidatesA, sideALabel, winnerA, onChangeA)}
      <div className="text-center text-xs text-gray-700">VS</div>
      {renderSide(isThirdB, teamB, candidatesB, sideBLabel, winnerB, onChangeB)}
      {(teamA || teamB) && (
        <div className="pt-1 border-t border-gray-800 space-y-1">
          <div className="text-xs text-gray-600 text-center">→ מי מתקדם לשמינית?</div>
          {teamA && <TeamBadge team={teamA} winner={winnerA} locked={locked} onClick={() => onPickWinner(teamA)} />}
          {teamB && <TeamBadge team={teamB} winner={winnerB} locked={locked} onClick={() => onPickWinner(teamB)} />}
        </div>
      )}
    </div>
  );
}

function R16Card({
  label, teamA, teamB, qfTeam, locked, onPickWinner,
}: {
  label: string; teamA: string; teamB: string;
  qfTeam: string; locked: boolean; onPickWinner: (t: string) => void;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-2">
      <div className="text-xs text-gray-400 font-medium">{label}</div>
      {!teamA && !teamB ? (
        <div className="text-xs text-gray-600 italic py-2 text-center">ממתין לסיבוב 32</div>
      ) : (
        <>
          {teamA
            ? <TeamBadge team={teamA} winner={qfTeam === teamA} locked={locked} onClick={() => onPickWinner(teamA)} />
            : <div className="h-9 bg-gray-800 rounded-lg border border-dashed border-gray-700" />
          }
          <div className="text-center text-xs text-gray-600 font-bold">VS</div>
          {teamB
            ? <TeamBadge team={teamB} winner={qfTeam === teamB} locked={locked} onClick={() => onPickWinner(teamB)} />
            : <div className="h-9 bg-gray-800 rounded-lg border border-dashed border-gray-700" />
          }
        </>
      )}
    </div>
  );
}

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

function SFCard({
  label, teamA, teamB, finalWinner, locked, onPickWinner,
}: {
  label: string; teamA: string; teamB: string;
  finalWinner: string; locked: boolean; onPickWinner: (t: string) => void;
}) {
  return (
    <div className="bg-gray-900 border border-gray-600 rounded-xl p-3 space-y-2">
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

function FinalCard({
  teamA, teamB, winner, locked, onPickWinner,
}: {
  teamA: string; teamB: string; winner: string; locked: boolean; onPickWinner: (t: string) => void;
}) {
  return (
    <div className="bg-gray-900 border-2 border-yellow-500/50 rounded-xl p-4 space-y-3">
      <div className="text-sm font-bold text-yellow-400 text-center">🏆 גמר</div>
      {!teamA && !teamB ? (
        <div className="text-xs text-gray-600 italic py-3 text-center">ממתין לחצי גמר</div>
      ) : (
        <>
          {teamA
            ? <TeamBadge team={teamA} winner={winner === teamA} locked={locked} onClick={() => onPickWinner(teamA)} />
            : <div className="h-9 bg-gray-800 rounded-lg border border-dashed border-gray-700" />
          }
          <div className="text-center text-xs text-gray-500 font-bold">VS</div>
          {teamB
            ? <TeamBadge team={teamB} winner={winner === teamB} locked={locked} onClick={() => onPickWinner(teamB)} />
            : <div className="h-9 bg-gray-800 rounded-lg border border-dashed border-gray-700" />
          }
          {winner && (
            <div className="text-center text-xs text-yellow-400 font-bold pt-1 border-t border-gray-700">
              🏆 אלוף: {winner}
            </div>
          )}
        </>
      )}
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
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");
  const [locked, setLocked] = useState(false);
  const [deadline, setDeadline] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings").then(r => r.json()),
      fetch(`/api/predictions/${versionNum}/standings`).then(r => r.json()),
      fetch(`/api/predictions/${versionNum}/knockout`).then(r => r.json()),
    ]).then(([s, standingsData, knockoutData]: [
      Record<string, string>,
      StandingPred[],
      KnockoutRow[]
    ]) => {
      const globalLocked = s["predictions_locked"] === "true";
      const dl = s[`version_${versionNum}_deadline`] ?? null;
      const pastDeadline = dl ? new Date() > new Date(dl) : false;
      setLocked(globalLocked || pastDeadline);
      setDeadline(dl);

      if (Array.isArray(standingsData)) setStandings(standingsData);

      if (Array.isArray(knockoutData) && knockoutData.length > 0) {
        const next = emptyPicks();
        for (const row of knockoutData) {
          // R32 slots are always auto-filled from standings — never loaded from DB
          if (row.stage === "R16" && row.slot >= 1 && row.slot <= 16) next.r16[row.slot - 1] = row.teamName;
          else if (row.stage === "QF"  && row.slot >= 1 && row.slot <= 8)  next.qf[row.slot - 1] = row.teamName;
          else if (row.stage === "SF"  && row.slot >= 1 && row.slot <= 4)  next.sf[row.slot - 1] = row.teamName;
          else if (row.stage === "FINAL" && row.slot >= 1 && row.slot <= 2) next.final[row.slot - 1] = row.teamName;
          else if (row.stage === "WINNER" && row.slot === 1) next.winner = row.teamName;
        }
        setPicks(next);
      }
    });
  }, [versionNum]);

  // Auto-fill fixed R32 slots (rank1/rank2) from standings when slots are empty
  useEffect(() => {
    if (standings.length === 0) return;
    setPicks(prev => {
      const next = { ...prev, r32: [...prev.r32] };
      let changed = false;
      R32_MATCH_DEFS.forEach((def, matchIdx) => {
        if (def.sideA.type !== "rank3") {
          const team = getAutoTeam(def.sideA, standings);
          if (team && !next.r32[matchIdx * 2]) { next.r32[matchIdx * 2] = team; changed = true; }
        }
        if (def.sideB.type !== "rank3") {
          const team = getAutoTeam(def.sideB, standings);
          if (team && !next.r32[matchIdx * 2 + 1]) { next.r32[matchIdx * 2 + 1] = team; changed = true; }
        }
      });
      return changed ? next : prev;
    });
  }, [standings]);

  // ─── Pick handlers ────────────────────────────────────────────────────────

  function setR32Team(matchIdx: number, side: 0 | 1, team: string) {
    setPicks(prev => {
      const next = { ...prev, r32: [...prev.r32] };
      const slotIdx = matchIdx * 2 + side;
      const oldTeam = prev.r32[slotIdx];
      next.r32[slotIdx] = team;
      const r16Slot = R32_TO_R16_SLOT[matchIdx];
      if (oldTeam && prev.r16[r16Slot] === oldTeam) {
        const r16MatchIdx = Math.floor(r16Slot / 2);
        const qfSlot = R16_TO_QF_SLOT[r16MatchIdx];
        const qfMatchIdx = Math.floor(qfSlot / 2);
        next.r16 = [...prev.r16]; next.r16[r16Slot] = "";
        if (prev.qf[qfSlot] === oldTeam) {
          next.qf = [...prev.qf]; next.qf[qfSlot] = "";
          if (prev.sf[qfMatchIdx] === oldTeam) {
            next.sf = [...prev.sf]; next.sf[qfMatchIdx] = "";
            const fIdx = qfMatchIdx <= 1 ? 0 : 1;
            if (prev.final[fIdx] === oldTeam) {
              next.final = [...prev.final]; next.final[fIdx] = "";
              if (prev.winner === oldTeam) next.winner = "";
            }
          }
        }
      }
      return next;
    });
  }

  function pickR32Winner(matchIdx: number, team: string) {
    const r16Slot = R32_TO_R16_SLOT[matchIdx];
    const r16MatchIdx = Math.floor(r16Slot / 2);
    const qfSlot = R16_TO_QF_SLOT[r16MatchIdx];
    const qfMatchIdx = Math.floor(qfSlot / 2);
    setPicks(prev => {
      const next = { ...prev, r16: [...prev.r16] };
      const old = prev.r16[r16Slot];
      next.r16[r16Slot] = team;
      if (old && prev.qf[qfSlot] === old) {
        next.qf = [...prev.qf]; next.qf[qfSlot] = "";
        if (prev.sf[qfMatchIdx] === old) {
          next.sf = [...prev.sf]; next.sf[qfMatchIdx] = "";
          const fIdx = qfMatchIdx <= 1 ? 0 : 1;
          if (prev.final[fIdx] === old) {
            next.final = [...prev.final]; next.final[fIdx] = "";
            if (prev.winner === old) next.winner = "";
          }
        }
      }
      return next;
    });
  }

  function pickR16Winner(r16MatchIdx: number, team: string) {
    const qfSlot = R16_TO_QF_SLOT[r16MatchIdx];
    const qfMatchIdx = Math.floor(qfSlot / 2);
    setPicks(prev => {
      const next = { ...prev, qf: [...prev.qf] };
      const old = prev.qf[qfSlot];
      next.qf[qfSlot] = team;
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
    setPicks(prev => {
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
    setPicks(prev => {
      const next = { ...prev, final: [...prev.final] };
      const old = prev.final[sfIdx];
      next.final[sfIdx] = team;
      if (old && prev.winner === old) next.winner = "";
      return next;
    });
  }

  const handleResetBracket = async () => {
    if (!window.confirm("לאפס את כל הברקט? כל הבחירות בנוקאאוט יימחקו.")) return;
    setResetting(true); setMessage("");
    const res = await fetch(`/api/predictions/${versionNum}/knockout`, { method: "DELETE" });
    setResetting(false);
    if (res.ok) {
      setPicks(emptyPicks());
      setStandings([]); // suppress auto-fill until reload — shows truly empty bracket
      setMessage("✓ הברקט אופסה!");
    }
    else setMessage("שגיאה באיפוס");
  };

  const handleSave = async () => {
    setSaving(true); setMessage("");
    const payload: KnockoutRow[] = [];
    // R32 slots are structural (from standings auto-fill) — not saved
    picks.r16.forEach((t, i) => { if (t) payload.push({ stage: "R16",    slot: i + 1, teamName: t }); });
    picks.qf.forEach((t, i)  => { if (t) payload.push({ stage: "QF",     slot: i + 1, teamName: t }); });
    picks.sf.forEach((t, i)  => { if (t) payload.push({ stage: "SF",     slot: i + 1, teamName: t }); });
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

  // ─── Render helpers ───────────────────────────────────────────────────────

  function renderR32Match(matchIdx: number) {
    const def = R32_MATCH_DEFS[matchIdx];
    const teamA = picks.r32[matchIdx * 2];
    const teamB = picks.r32[matchIdx * 2 + 1];
    const r16Slot = R32_TO_R16_SLOT[matchIdx];
    const r16Team = picks.r16[r16Slot];
    const isThirdA = def.sideA.type === "rank3";
    const isThirdB = def.sideB.type === "rank3";
    const candidatesA = isThirdA
      ? getRank3Candidates((def.sideA as { type: "rank3"; groups: string[] }).groups, standings) : [];
    const candidatesB = isThirdB
      ? getRank3Candidates((def.sideB as { type: "rank3"; groups: string[] }).groups, standings) : [];
    return (
      <R32Card
        key={matchIdx}
        label={def.labelHe}
        sideALabel={getSideLabel(def.sideA)}
        sideBLabel={getSideLabel(def.sideB)}
        isThirdA={isThirdA} isThirdB={isThirdB}
        teamA={teamA} teamB={teamB}
        candidatesA={candidatesA} candidatesB={candidatesB}
        r16Team={r16Team} locked={locked}
        onChangeA={t => setR32Team(matchIdx, 0, t)}
        onChangeB={t => setR32Team(matchIdx, 1, t)}
        onPickWinner={t => pickR32Winner(matchIdx, t)}
      />
    );
  }

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
        <Link href={`/predictions/${versionNum}/instructions`} className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap border-b-2 border-transparent">
          הוראות
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">ברקט — גרסה {versionNum}</h1>
          <p className="text-gray-400 text-sm">ניחוש שלב הנוקאאוט: ס׳32 → ש׳גמר → רבע → חצי → גמר</p>
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
          </Link>
          {" "}— הברקט יציג אוטומטית את הקבוצות לפי הבית שלהן
        </div>
      )}

      {message && (
        <p className={`text-sm mb-4 ${message.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{message}</p>
      )}

      {/* ─── R32 ─────────────────────────────────────────────────────────────── */}
      <section className="mb-8">
        <ColHeader>סיבוב 32 — 16 משחקים</ColHeader>
        <p className="text-xs text-gray-600 text-center mb-3">
          עמודות 3rd = בחר איזה מקום שלישי עולה • לחץ על קבוצה כדי לבחור מי מתקדם
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 16 }, (_, i) => renderR32Match(i))}
        </div>
      </section>

      {/* ─── R16 ─────────────────────────────────────────────────────────────── */}
      <section className="mb-8">
        <ColHeader>שמינית גמר — 8 משחקים</ColHeader>
        <p className="text-xs text-gray-600 text-center mb-3">
          ממולא אוטומטית מהסיבוב 32 • לחץ על קבוצה כדי לבחור מי עולה לרבע
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }, (_, i) => (
            <R16Card
              key={i}
              label={`שמינית גמר ${i + 1}`}
              teamA={picks.r16[i * 2]}
              teamB={picks.r16[i * 2 + 1]}
              qfTeam={picks.qf[R16_TO_QF_SLOT[i]]}
              locked={locked}
              onPickWinner={t => pickR16Winner(i, t)}
            />
          ))}
        </div>
      </section>

      {/* ─── QF ──────────────────────────────────────────────────────────────── */}
      <section className="mb-8">
        <ColHeader>רבע גמר — 4 משחקים</ColHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
          {Array.from({ length: 4 }, (_, i) => (
            <QFCard
              key={i}
              label={`רבע גמר ${i + 1}`}
              teamA={picks.qf[i * 2]}
              teamB={picks.qf[i * 2 + 1]}
              sfTeam={picks.sf[i]}
              locked={locked}
              onPickWinner={t => pickQFWinner(i, t)}
            />
          ))}
        </div>
      </section>

      {/* ─── SF + Final ───────────────────────────────────────────────────────── */}
      <section className="mb-6">
        <ColHeader>חצי גמר וגמר</ColHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 max-w-3xl mx-auto">
          <SFCard
            label="חצי גמר 1"
            teamA={picks.sf[0]} teamB={picks.sf[1]}
            finalWinner={picks.final[0]}
            locked={locked}
            onPickWinner={t => pickSFWinner(0, t)}
          />
          <FinalCard
            teamA={picks.final[0]} teamB={picks.final[1]}
            winner={picks.winner}
            locked={locked}
            onPickWinner={t => setPicks(p => ({ ...p, winner: t }))}
          />
          <SFCard
            label="חצי גמר 2"
            teamA={picks.sf[2]} teamB={picks.sf[3]}
            finalWinner={picks.final[1]}
            locked={locked}
            onPickWinner={t => pickSFWinner(1, t)}
          />
        </div>
      </section>

      {!locked && (
        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={handleResetBracket}
            disabled={resetting || saving}
            className="bg-gray-700 hover:bg-red-700 disabled:opacity-50 text-white font-bold px-6 py-2 rounded-lg transition-colors"
          >
            {resetting ? "מאפס..." : "אפס ברקט"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || resetting}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold px-8 py-2 rounded-lg transition-colors"
          >
            {saving ? "שומר..." : "שמור ברקט"}
          </button>
        </div>
      )}
    </div>
  );
}

