import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Returns ALL data needed for the predictions/[version] page in one request,
 * replacing 6 separate API calls with a single parallelised DB fetch.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ version: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { version } = await params;
  const versionNum = parseInt(version, 10);
  if (![1, 2, 3].includes(versionNum)) {
    return NextResponse.json({ error: "Invalid version" }, { status: 400 });
  }

  const [settings, matches, scoringRules, user, predictions, knockoutPicks] =
    await Promise.all([
      prisma.appSetting.findMany(),
      prisma.match.findMany({ orderBy: { scheduledAt: "asc" } }),
      prisma.scoringRule.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { maxVersions: true },
      }),
      prisma.prediction.findMany({
        where: { userId: session.user.id, version: versionNum },
        select: {
          matchId: true,
          homeScore: true,
          awayScore: true,
          match: { select: { status: true, homeTeam: true, awayTeam: true, stage: true } },
        },
      }),
      prisma.knockoutPrediction.findMany({
        where: { userId: session.user.id, version: versionNum },
        select: { stage: true },
      }),
    ]);

  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  const knockoutCounts: Record<string, number> = {};
  for (const pick of knockoutPicks) {
    knockoutCounts[pick.stage] = (knockoutCounts[pick.stage] ?? 0) + 1;
  }

  return NextResponse.json({
    settings: settingsMap,
    matches,
    scoringRules,
    maxVersions: user?.maxVersions ?? 1,
    predictions,
    knockoutCounts,
  });
}
