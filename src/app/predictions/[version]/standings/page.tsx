"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getFlagUrl } from "@/lib/flags";
import { computeGroupOrdersFromPredictions } from "@/lib/group-standings";

// Groups A-L and their teams (from WC 2026 draw)
const GROUPS: Record<string, string[]> = {
  A: ["Mexico", "South Africa", "South Korea", "Czech Republic"],
  B: ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["United States", "Paraguay", "Australia", "Turkey"],
  E: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};

// ─── Sortable Item ─────────────────────────────────────────────────────────────

function SortableTeam({
  id,
  rank,
  locked,
}: {
  id: string;
  rank: number;
  locked: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: locked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const flagUrl = getFlagUrl(id);
  const rankColors = ["text-yellow-400", "text-gray-300", "text-amber-600", "text-gray-500"];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
        isDragging
          ? "border-yellow-500 bg-gray-700"
          : "border-gray-700 bg-gray-800"
      } ${locked ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
    >
      <span
        className={`text-sm font-bold w-5 text-center ${rankColors[rank - 1]}`}
      >
        {rank}
      </span>
      {flagUrl && (
        <img
          src={flagUrl}
          alt={id}
          className="w-6 h-4 object-cover rounded-sm"
        />
      )}
      <span className="flex-1 text-sm text-white">{id}</span>
      {!locked && (
        <span
          {...attributes}
          {...listeners}
          className="text-gray-500 hover:text-gray-300 select-none px-2 py-1 text-lg touch-none"
          aria-label="drag handle"
        >
          ⠿
        </span>
      )}
    </div>
  );
}

// ─── Group Card ────────────────────────────────────────────────────────────────

function GroupCard({
  groupName,
  teams,
  onReorder,
  locked,
}: {
  groupName: string;
  teams: string[];
  onReorder: (groupName: string, newOrder: string[]) => void;
  locked: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = teams.indexOf(active.id as string);
      const newIndex = teams.indexOf(over.id as string);
      onReorder(groupName, arrayMove(teams, oldIndex, newIndex));
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-bold text-yellow-400 mb-3">
        בית {groupName}
      </h3>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={teams} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {teams.map((team, idx) => (
              <SortableTeam
                key={team}
                id={team}
                rank={idx + 1}
                locked={locked}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function StandingsPage() {
  const { version } = useParams<{ version: string }>();
  const versionNum = parseInt(version, 10);

  const [groupOrder, setGroupOrder] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      Object.entries(GROUPS).map(([g, teams]) => [g, [...teams]])
    )
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [versionLocked, setVersionLocked] = useState(false);
  const [deadline, setDeadline] = useState<string | null>(null);

  // Load settings + existing predictions
  useEffect(() => {
    type MatchRow = {
      id: string;
      homeTeam: string;
      awayTeam: string;
      stage: string;
      groupName: string | null;
    };
    type PredRow = { matchId: string; homeScore: number; awayScore: number };

    Promise.all([
      fetch("/api/admin/settings").then((r) => r.json()),
      fetch(`/api/predictions/${versionNum}/standings`).then((r) => r.json()),
      fetch("/api/matches").then((r) => r.json()),
      fetch(`/api/predictions/${versionNum}`).then((r) => r.json()),
    ]).then(([s, standingData, matchesData, predsData]: [
      Record<string, string>,
      { groupName: string; rank1: string; rank2: string; rank3: string; rank4: string }[],
      MatchRow[],
      PredRow[]
    ]) => {
      const globalLocked = s["predictions_locked"] === "true";
      const dl = s[`version_${versionNum}_deadline`] ?? null;
      const pastDeadline = dl ? new Date() > new Date(dl) : false;
      setVersionLocked(globalLocked || pastDeadline);
      setDeadline(dl);

      const predMap: Record<string, { home: number; away: number }> = {};
      if (Array.isArray(predsData)) {
        for (const p of predsData) {
          predMap[p.matchId] = { home: p.homeScore, away: p.awayScore };
        }
      }

      const computedOrder = Array.isArray(matchesData)
        ? computeGroupOrdersFromPredictions(matchesData, predMap)
        : {};

      setGroupOrder((prev) => {
        const next = { ...prev };

        for (const [groupName, teams] of Object.entries(computedOrder)) {
          if (teams.length >= 4) {
            next[groupName] = [teams[0], teams[1], teams[2], teams[3]];
          }
        }

        if (Array.isArray(standingData)) {
          for (const row of standingData) {
            if (!computedOrder[row.groupName]) {
              next[row.groupName] = [row.rank1, row.rank2, row.rank3, row.rank4];
            }
          }
        }

        return next;
      });
    });

  }, [versionNum]);

  const handleReorder = useCallback(
    (groupName: string, newOrder: string[]) => {
      setGroupOrder((prev) => ({ ...prev, [groupName]: newOrder }));
    },
    []
  );

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    const standings = Object.entries(groupOrder).map(([groupName, order]) => ({
      groupName,
      rank1: order[0],
      rank2: order[1],
      rank3: order[2],
      rank4: order[3],
    }));

    const res = await fetch(`/api/predictions/${versionNum}/standings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ standings }),
    });
    setSaving(false);

    if (res.ok) {
      setMessage("✓ עמדות הקבוצות נשמרו!");
    } else {
      const err = await res.json();
      setMessage(err.error ?? "שגיאה בשמירה");
    }
  };

  const deadlineLabel = deadline
    ? new Date(deadline).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })
    : null;

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
        <span className="px-3 py-2 text-sm text-white font-semibold whitespace-nowrap border-b-2 border-yellow-400">
          עמדות קבוצות
        </span>
        <Link
          href={`/predictions/${versionNum}/bracket`}
          className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap border-b-2 border-transparent"
        >
          ברקט
        </Link>
        <Link
          href={`/predictions/${versionNum}/instructions`}
          className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap border-b-2 border-transparent"
        >
          הוראות
        </Link>
      </div>

      <h1 className="text-xl font-bold text-white mb-1">
        עמדות קבוצות — גרסה {versionNum}
      </h1>
      <p className="text-gray-400 text-sm mb-4">
        גרור את הקבוצות לסדר הצפוי בכל בית (1 = ראשון)
      </p>

      {deadlineLabel && (
        <p className="text-xs text-gray-500 mb-4">
          דד-ליין: {deadlineLabel}
        </p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {Object.entries(groupOrder).map(([groupName, teams]) => (
          <GroupCard
            key={groupName}
            groupName={groupName}
            teams={teams}
            onReorder={handleReorder}
            locked={versionLocked}
          />
        ))}
      </div>

      {!versionLocked && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold px-6 py-2 rounded-lg transition-colors"
          >
            {saving ? "שומר..." : "שמור עמדות"}
          </button>
        </div>
      )}
    </div>
  );
}
