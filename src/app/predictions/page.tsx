import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function PredictionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  // Get score totals per version
  const predictions = await prisma.prediction.findMany({
    where: { userId: session.user.id },
    include: { scores: true },
  });

  const versionTotals: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  const versionCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

  for (const pred of predictions) {
    const pts = pred.scores.reduce((s, sc) => s + sc.points, 0);
    versionTotals[pred.version] = (versionTotals[pred.version] ?? 0) + pts;
    versionCounts[pred.version] = (versionCounts[pred.version] ?? 0) + 1;
  }

  const totalMatches = await prisma.match.count();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-green-400 mb-6">הניחושים שלי</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((v) => (
          <Link
            key={v}
            href={`/predictions/${v}`}
            className="bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl p-5 transition-colors"
          >
            <div className="text-lg font-semibold text-white mb-1">גרסה {v}</div>
            <div className="text-3xl font-bold text-green-400 mb-2">
              {versionTotals[v] ?? 0} נק'
            </div>
            <div className="text-sm text-gray-400">
              {versionCounts[v] ?? 0} / {totalMatches} ניחושים
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
