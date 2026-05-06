import { LeaderboardTable } from "@/components/LeaderboardTable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-green-400 mb-6 text-center">
        ⚽ לוח מובילים — מונדיאל 2026
      </h1>
      <LeaderboardTable />
    </div>
  );
}
