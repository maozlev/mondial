import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) redirect("/");

  const totalMatches = await prisma.match.count();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      predictions: {
        select: {
          version: true,
          scores: { select: { points: true } },
        },
      },
    },
  });

  const stats = users
    .map((u) => {
      const vs: Record<number, { count: number; points: number }> = {
        1: { count: 0, points: 0 },
        2: { count: 0, points: 0 },
        3: { count: 0, points: 0 },
      };
      for (const pred of u.predictions) {
        const pts = pred.scores.reduce((s, sc) => s + sc.points, 0);
        vs[pred.version].count++;
        vs[pred.version].points += pts;
      }
      const bestPoints = Math.max(vs[1].points, vs[2].points, vs[3].points);
      return { ...u, vs, bestPoints };
    })
    .sort((a, b) => b.bestPoints - a.bestPoints);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-400 hover:text-white text-sm">
          ← ניהול
        </Link>
        <h1 className="text-2xl font-bold text-yellow-400">
          👥 משתמשים ({stats.length})
        </h1>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900">
            <tr className="border-b border-gray-800 text-gray-400 text-right">
              <th className="py-3 px-3 font-medium">#</th>
              <th className="py-3 px-3 font-medium">שם / אימייל</th>
              <th className="py-3 px-3 font-medium">גרסה 1</th>
              <th className="py-3 px-3 font-medium">גרסה 2</th>
              <th className="py-3 px-3 font-medium">גרסה 3</th>
              <th className="py-3 px-3 font-medium">מקסימום</th>
              <th className="py-3 px-3 font-medium">תפקיד</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((u, i) => (
              <tr
                key={u.id}
                className="border-b border-gray-900 hover:bg-gray-900/50 transition-colors"
              >
                <td className="py-3 px-3 text-gray-500 font-medium">{i + 1}</td>
                <td className="py-3 px-3">
                  <div className="font-medium text-white">{u.name ?? "—"}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </td>
                <td className="py-3 px-3">
                  <VersionCell count={u.vs[1].count} points={u.vs[1].points} total={totalMatches} />
                </td>
                <td className="py-3 px-3">
                  <VersionCell count={u.vs[2].count} points={u.vs[2].points} total={totalMatches} />
                </td>
                <td className="py-3 px-3">
                  <VersionCell count={u.vs[3].count} points={u.vs[3].points} total={totalMatches} />
                </td>
                <td className="py-3 px-3">
                  <span className="font-bold text-white">{u.bestPoints}</span>
                  <span className="text-gray-500 text-xs"> נק'</span>
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.role === "ADMIN"
                        ? "bg-yellow-900/70 text-yellow-400"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {u.role === "ADMIN" ? "אדמין" : "משתמש"}
                  </span>
                </td>
              </tr>
            ))}
            {stats.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500">
                  אין משתמשים רשומים עדיין
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VersionCell({
  count,
  points,
  total,
}: {
  count: number;
  points: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <span className="font-bold text-green-400">{points}</span>
      <span className="text-gray-500 text-xs"> נק'</span>
      <div className="text-xs text-gray-600 mt-0.5">
        {count}/{total} ({pct}%)
      </div>
    </div>
  );
}
