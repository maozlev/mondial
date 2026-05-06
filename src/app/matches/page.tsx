import { prisma } from "@/lib/prisma";
import { MatchCard } from "@/components/MatchCard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GROUP_ORDER = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export default async function MatchesPage() {
  const matches = await prisma.match.findMany({
    where: { stage: "GROUP" },
    orderBy: [{ groupName: "asc" }, { scheduledAt: "asc" }],
  });

  // Group by groupName
  const grouped = new Map<string, typeof matches>();
  for (const match of matches) {
    const g = match.groupName ?? "?";
    if (!grouped.has(g)) grouped.set(g, []);
    grouped.get(g)!.push(match);
  }

  const sortedGroups = GROUP_ORDER.filter((g) => grouped.has(g));

  return (
    <div className="max-w-3xl mx-auto px-3 py-8 sm:px-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-green-400 mb-2 text-center">
        ⚽ משחקי שלב הבתים
      </h1>
      <p className="text-center text-gray-400 text-sm mb-8">
        מונדיאל 2026 · 11 יוני – 28 יוני
      </p>

      <div className="space-y-10">
        {sortedGroups.map((groupName) => {
          const groupMatches = grouped.get(groupName)!;

          // Group by matchday date
          const byDate = new Map<string, typeof matches>();
          for (const m of groupMatches) {
            const d = new Date(m.scheduledAt).toLocaleDateString("he-IL", {
              weekday: "short",
              day: "numeric",
              month: "short",
              timeZone: "Asia/Jerusalem",
            });
            if (!byDate.has(d)) byDate.set(d, []);
            byDate.get(d)!.push(m);
          }

          return (
            <section key={groupName}>
              {/* Group header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
                  {groupName}
                </div>
                <h2 className="text-lg font-semibold text-white">בית {groupName}</h2>
                <div className="flex-1 h-px bg-gray-800" />
              </div>

              <div className="space-y-2">
                {groupMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={{
                      id: match.id,
                      homeTeam: match.homeTeam,
                      awayTeam: match.awayTeam,
                      groupName: match.groupName,
                      scheduledAt: match.scheduledAt.toISOString(),
                      status: match.status,
                      homeScore: match.homeScore,
                      awayScore: match.awayScore,
                    }}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
