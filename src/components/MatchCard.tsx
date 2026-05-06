"use client";

import { getFlagUrl } from "@/lib/flags";

export interface MatchCardMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  groupName: string | null;
  scheduledAt: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface MatchCardProps {
  match: MatchCardMatch;
  /** view (default) = read-only; predict = show score inputs */
  mode?: "view" | "predict";
  homeScore?: number;
  awayScore?: number;
  onHomeChange?: (value: string) => void;
  onAwayChange?: (value: string) => void;
  isSaved?: boolean;
}

function FlagImg({ team }: { team: string }) {
  const url = getFlagUrl(team);
  if (!url) return <span className="w-7 h-5 inline-block bg-gray-700 rounded-sm" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={team}
      width={40}
      height={27}
      className="w-7 h-5 object-cover rounded-sm shadow-sm flex-shrink-0"
    />
  );
}

export function MatchCard({
  match,
  mode = "view",
  homeScore = 0,
  awayScore = 0,
  onHomeChange,
  onAwayChange,
  isSaved = false,
}: MatchCardProps) {
  const { homeTeam, awayTeam, groupName, scheduledAt, status } = match;
  const isLocked = status !== "UPCOMING";
  const isFinished = status === "FINISHED";

  const date = new Date(scheduledAt);
  const dateLabel = date.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "numeric",
    timeZone: "Asia/Jerusalem",
  });
  const timeLabel = date.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jerusalem",
  });

  return (
    <div
      className={`rounded-xl overflow-hidden border transition-colors ${
        isLocked
          ? "border-gray-700 opacity-75"
          : "border-gray-700 hover:border-green-800"
      } bg-gray-900`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/70 text-xs text-gray-400">
        <span>{groupName ? `בית ${groupName}` : "שלב נוקאאוט"}</span>
        <span className="flex items-center gap-1.5">
          {isFinished && (
            <span className="text-gray-300 font-medium">גמר</span>
          )}
          {status === "LOCKED" && (
            <span className="text-orange-400">
              🔒 <span>נעול</span>
            </span>
          )}
          <span>{dateLabel}</span>
        </span>
      </div>

      {/* Match row */}
      <div className="flex items-center gap-2 px-3 py-3 sm:px-4 sm:py-4">
        {/* Home team */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <FlagImg team={homeTeam} />
          <span className="font-semibold text-white text-sm sm:text-base truncate leading-tight">
            {homeTeam}
          </span>
        </div>

        {/* Center: time / score / inputs */}
        <div className="flex-shrink-0 flex flex-col items-center w-24 sm:w-28">
          {isFinished ? (
            <div className="flex items-center gap-1 font-bold text-lg sm:text-xl text-white">
              <span>{match.homeScore}</span>
              <span className="text-gray-500 text-base">–</span>
              <span>{match.awayScore}</span>
            </div>
          ) : mode === "predict" ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={20}
                value={homeScore}
                onChange={(e) => onHomeChange?.(e.target.value)}
                disabled={isLocked}
                aria-label={`תחזית ${homeTeam}`}
                className="w-10 sm:w-11 text-center bg-gray-800 border border-gray-700 rounded-lg py-1.5 text-white font-bold focus:border-green-500 focus:outline-none disabled:opacity-40 text-sm"
              />
              <span className="text-gray-500 font-bold">:</span>
              <input
                type="number"
                min={0}
                max={20}
                value={awayScore}
                onChange={(e) => onAwayChange?.(e.target.value)}
                disabled={isLocked}
                aria-label={`תחזית ${awayTeam}`}
                className="w-10 sm:w-11 text-center bg-gray-800 border border-gray-700 rounded-lg py-1.5 text-white font-bold focus:border-green-500 focus:outline-none disabled:opacity-40 text-sm"
              />
            </div>
          ) : (
            <time
              dateTime={scheduledAt}
              className="text-green-400 font-mono font-medium text-sm sm:text-base"
            >
              {timeLabel}
            </time>
          )}

          {mode === "predict" && !isFinished && (
            <div className="mt-1 h-3 flex items-center">
              {isSaved ? (
                <span title="נשמר" className="text-green-400 text-xs">
                  ✓ נשמר
                </span>
              ) : (
                <span className="text-gray-600 text-xs">{timeLabel}</span>
              )}
            </div>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
          <span className="font-semibold text-white text-sm sm:text-base truncate leading-tight text-right">
            {awayTeam}
          </span>
          <FlagImg team={awayTeam} />
        </div>
      </div>
    </div>
  );
}
