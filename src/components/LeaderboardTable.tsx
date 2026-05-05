"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface LeaderboardRow {
  userId: string;
  name: string | null;
  image: string | null;
  rank: number;
  totalPoints: number;
  version?: number;
}

interface LeaderboardResponse {
  mode: string;
  rows: LeaderboardRow[];
}

export function LeaderboardTable() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const res = await fetch("/api/leaderboard");
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <p className="text-center text-gray-400 py-12">טוען...</p>;
  }

  if (!data || data.rows.length === 0) {
    return <p className="text-center text-gray-500 py-12">אין נתונים עדיין</p>;
  }

  const isSeparate = data.mode === "SEPARATE";

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
          <tr>
            <th className="px-4 py-3 text-right">מקום</th>
            <th className="px-4 py-3 text-right">שחקן</th>
            {isSeparate && <th className="px-4 py-3 text-right">גרסה</th>}
            <th className="px-4 py-3 text-right">נקודות</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {data.rows.map((row, idx) => (
            <tr
              key={`${row.userId}-${row.version ?? "all"}`}
              className={`transition-colors ${
                idx % 2 === 0 ? "bg-gray-900/40" : "bg-gray-900/20"
              } hover:bg-gray-800/60`}
            >
              <td className="px-4 py-3 font-bold text-green-400">#{row.rank}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {row.image && (
                    <Image
                      src={row.image}
                      alt={row.name ?? ""}
                      width={28}
                      height={28}
                      className="rounded-full"
                    />
                  )}
                  <span>{row.name ?? "אנונימי"}</span>
                </div>
              </td>
              {isSeparate && (
                <td className="px-4 py-3 text-gray-400">גרסה {row.version}</td>
              )}
              <td className="px-4 py-3 font-semibold text-white">{row.totalPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
