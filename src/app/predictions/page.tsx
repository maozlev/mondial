import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PredictionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  // Get score totals and counts per version
  const predictions = await prisma.prediction.findMany({
    where: { userId: session.user.id },
    include: { scores: true },
  });

  const versionTotals: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  const versionCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

  for (const pred of predictions) {
    const pts = pred.scores.reduce((s: number, sc: { points: number }) => s + sc.points, 0);
    versionTotals[pred.version] = (versionTotals[pred.version] ?? 0) + pts;
    versionCounts[pred.version] = (versionCounts[pred.version] ?? 0) + 1;
  }

  const [totalMatches, settings] = await Promise.all([
    prisma.match.count(),
    prisma.appSetting.findMany(),
  ]);

  const settingsMap = Object.fromEntries(settings.map((s: { key: string; value: string }) => [s.key, s.value]));
  const globalLocked = settingsMap["predictions_locked"] === "true";

  const now = new Date();

  const versionInfo = [1, 2, 3].map((v) => {
    const deadlineStr = settingsMap[`version_${v}_deadline`] ?? null;
    const deadline = deadlineStr ? new Date(deadlineStr) : null;
    const isPast = deadline ? now > deadline : false;
    const isLocked = globalLocked || isPast;
    const count = versionCounts[v] ?? 0;
    const points = versionTotals[v] ?? 0;
    const pct = totalMatches > 0 ? Math.round((count / totalMatches) * 100) : 0;
    return { v, deadline, isPast, isLocked, count, points, pct };
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-green-400 mb-2">הניחושים שלי</h1>
      <p className="text-gray-400 text-sm mb-6">
        3 ניסיונות ניחוש לכל {totalMatches} משחקי המונדיאל
      </p>

      {globalLocked && (
        <div className="bg-orange-900/30 border border-orange-800 rounded-xl px-4 py-3 mb-6 text-sm text-orange-300">
          🔒 הניחושים נעולים כרגע על ידי המנהל
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {versionInfo.map(({ v, deadline, isPast, isLocked, count, points, pct }) => (
          <Link
            key={v}
            href={`/predictions/${v}`}
            className="bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl p-5 transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-full bg-green-700 group-hover:bg-green-600 flex items-center justify-center font-bold text-white text-sm transition-colors">
                {v}
              </div>
              {isLocked ? (
                <span className="text-xs text-orange-400">🔒 נעול</span>
              ) : (
                <span className="text-xs text-green-500">✎ פתוח</span>
              )}
            </div>

            <div className="text-3xl font-bold text-green-400 mb-1">
              {points}
              <span className="text-base font-normal text-gray-400"> נק'</span>
            </div>

            {/* Progress bar */}
            <div className="mb-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{count} / {totalMatches} ניחושים</span>
                <span>{pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Deadline */}
            {deadline && (
              <div className={`text-xs mt-2 ${isPast ? "text-red-400" : "text-blue-400"}`}>
                {isPast ? "⏰ נסגר" : "⏰ עד"}{" "}
                {deadline.toLocaleString("he-IL", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Jerusalem",
                })}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
