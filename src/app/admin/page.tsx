import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPage() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) redirect("/");

  const [matchCount, userCount, ruleCount, settings] = await Promise.all([
    prisma.match.count(),
    prisma.user.count(),
    prisma.scoringRule.count({ where: { isActive: true } }),
    prisma.appSetting.findMany(),
  ]);

  const settingsMap = Object.fromEntries(settings.map((s: { key: string; value: string }) => [s.key, s.value]));

  // Match status breakdown
  const [upcoming, locked, finished] = await Promise.all([
    prisma.match.count({ where: { status: "UPCOMING" } }),
    prisma.match.count({ where: { status: "LOCKED" } }),
    prisma.match.count({ where: { status: "FINISHED" } }),
  ]);

  // Prediction stats per version
  const predStats = await Promise.all(
    [1, 2, 3].map(async (v) => {
      const uniqueUsers = await prisma.prediction.groupBy({
        by: ["userId"],
        where: { version: v },
      });
      const total = await prisma.prediction.count({ where: { version: v } });
      return { version: v, users: uniqueUsers.length, total };
    })
  );

  // Top 5 users by best-version score
  const allPredictions = await prisma.prediction.findMany({
    include: {
      scores: { select: { points: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const userScores = new Map<
    string,
    { name: string; email: string; v: Record<number, number> }
  >();
  for (const pred of allPredictions) {
    const uid = pred.user.id;
    if (!userScores.has(uid)) {
      userScores.set(uid, {
        name: pred.user.name ?? pred.user.email,
        email: pred.user.email,
        v: { 1: 0, 2: 0, 3: 0 },
      });
    }
    const pts = pred.scores.reduce((s: number, sc: { points: number }) => s + sc.points, 0);
    userScores.get(uid)!.v[pred.version] =
      (userScores.get(uid)!.v[pred.version] ?? 0) + pts;
  }

  const leaderboard = [...userScores.values()]
    .map((u) => ({ ...u, best: Math.max(u.v[1], u.v[2], u.v[3]) }))
    .sort((a, b) => b.best - a.best)
    .slice(0, 5);

  const deadlines = [1, 2, 3].map((v) => ({
    version: v,
    value: settingsMap[`version_${v}_deadline`] ?? null,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-yellow-400 mb-6">⚙️ פאנל ניהול</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="משחקים" value={matchCount} />
        <StatCard label="משתמשים" value={userCount} />
        <StatCard label="כללי ניקוד" value={ruleCount} />
        <StatCard label="סה&quot;כ ניחושים" value={predStats.reduce((s, p) => s + p.total, 0)} />
      </div>

      {/* Match status */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <h2 className="font-semibold text-white mb-3">סטטוס משחקים</h2>
        <div className="flex gap-6 flex-wrap">
          <Pill color="green" label="פתוח" value={upcoming} />
          <Pill color="orange" label="נעול" value={locked} />
          <Pill color="gray" label="הסתיים" value={finished} />
        </div>
      </div>

      {/* Version stats + deadlines */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {predStats.map((ps) => {
          const dl = deadlines.find((d) => d.version === ps.version)?.value ?? null;
          const isPast = dl ? new Date() > new Date(dl) : false;
          return (
            <div key={ps.version} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                גרסה {ps.version}
              </div>
              <div className="text-2xl font-bold text-green-400">{ps.users}</div>
              <div className="text-xs text-gray-500 mb-3">משתתפים · {ps.total} ניחושים</div>
              {dl ? (
                <div className={`text-xs px-2 py-0.5 rounded ${isPast ? "bg-red-900/60 text-red-400" : "bg-blue-900/60 text-blue-400"}`}>
                  {isPast ? "🔒 נסגר" : "⏰ פתוח עד"}{" "}
                  {new Date(dl).toLocaleString("he-IL", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    timeZone: "Asia/Jerusalem",
                  })}
                </div>
              ) : (
                <div className="text-xs text-gray-600">ללא דד-ליין</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Top leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">🏆 טופ 5 שחקנים</h2>
            <Link href="/" className="text-xs text-gray-400 hover:text-white">לוח מלא ←</Link>
          </div>
          <div className="space-y-2">
            {leaderboard.map((u, i) => (
              <div key={u.email} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm w-5">{i + 1}</span>
                  <span className="text-sm text-white">{u.name}</span>
                </div>
                <span className="font-bold text-green-400 text-sm">{u.best} נק'</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AdminLink href="/admin/matches" title="🏟️ ניהול משחקים" desc="הוסף, ערוך, נעל משחקים" />
        <AdminLink href="/admin/results" title="📊 הזנת תוצאות" desc="עדכן תוצאות ← מחשב אוטומטי" />
        <AdminLink href="/admin/scoring" title="🏆 חוקי ניקוד" desc="הגדר אירועים ונקודות" />
        <AdminLink href="/admin/users" title="👥 משתמשים" desc="כל המשתתפים + ניקוד" />
        <AdminLink href="/admin/settings" title="⚙️ הגדרות" desc="דד-ליינים, נעילה, מצב דירוג" />
        <AdminLink href="/admin/group-standings" title="🗂️ עמדות קבוצות" desc="הגדר תוצאות בתים לניקוד" />
        <AdminLink href="/admin/knockout-results" title="🥊 תוצאות ברקט" desc="הגדר קבוצות שעלו לכל שלב" />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}

function Pill({ color, label, value }: { color: string; label: string; value: number }) {
  const colors: Record<string, string> = {
    green: "text-green-400",
    orange: "text-orange-400",
    gray: "text-gray-400",
  };
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xl font-bold ${colors[color]}`}>{value}</span>
      <span className="text-sm text-gray-400">{label}</span>
    </div>
  );
}

function AdminLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl p-5 transition-colors block"
    >
      <div className="font-semibold text-white mb-1">{title}</div>
      <div className="text-sm text-gray-400">{desc}</div>
    </Link>
  );
}
