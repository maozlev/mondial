import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) redirect("/");

  const [matchCount, userCount, ruleCount] = await Promise.all([
    prisma.match.count(),
    prisma.user.count(),
    prisma.scoringRule.count({ where: { isActive: true } }),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-yellow-400 mb-6">פאנל ניהול</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="משחקים" value={matchCount} />
        <StatCard label="משתמשים" value={userCount} />
        <StatCard label="כללי ניקוד פעילים" value={ruleCount} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AdminLink href="/admin/matches" title="🏟️ ניהול משחקים" desc="הוסף, ערוך, נעל משחקים" />
        <AdminLink href="/admin/results" title="📊 הזנת תוצאות" desc="עדכן תוצאות ← מחשב אוטומטי" />
        <AdminLink href="/admin/scoring" title="🏆 חוקי ניקוד" desc="הגדר אירועים ונקודות" />
        <AdminLink href="/admin/settings" title="⚙️ הגדרות" desc="מצב דירוג, נעילה גלובלית" />
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
