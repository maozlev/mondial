import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildLeaderboard, LeaderboardMode, UserVersionScore } from "@/lib/leaderboard";

export async function GET() {
  // Get leaderboard mode from settings
  const modeSetting = await prisma.appSetting.findUnique({
    where: { key: "leaderboard_mode" },
  });
  const mode = (modeSetting?.value as LeaderboardMode) ?? LeaderboardMode.SEPARATE;

  // Aggregate scores per user per version
  const users = await prisma.user.findMany({
    select: { id: true, name: true, image: true },
  });

  const scoreAgg = await prisma.predictionScore.groupBy({
    by: ["predictionId"],
    _sum: { points: true },
  });

  // Map predictionId → total points
  const predictionPoints = new Map<string, number>();
  for (const agg of scoreAgg) {
    predictionPoints.set(agg.predictionId, agg._sum.points ?? 0);
  }

  // Group by userId + version
  const predictions = await prisma.prediction.findMany({
    select: { id: true, userId: true, version: true },
  });

  const userVersionMap = new Map<string, Record<1 | 2 | 3, number>>();
  for (const user of users) {
    userVersionMap.set(user.id, { 1: 0, 2: 0, 3: 0 });
  }

  for (const pred of predictions) {
    const entry = userVersionMap.get(pred.userId);
    if (entry && [1, 2, 3].includes(pred.version)) {
      const pts = predictionPoints.get(pred.id) ?? 0;
      entry[pred.version as 1 | 2 | 3] += pts;
    }
  }

  const data: UserVersionScore[] = users.map((u: typeof users[number]) => ({
    userId: u.id,
    name: u.name,
    image: u.image,
    versionPoints: userVersionMap.get(u.id) ?? { 1: 0, 2: 0, 3: 0 },
  }));

  const rows = buildLeaderboard(data, mode);
  return NextResponse.json({ mode, rows });
}
