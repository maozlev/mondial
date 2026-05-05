import { prisma } from "@/lib/prisma";
import { calculatePredictionScore } from "@/lib/scoring";

/**
 * Recalculate all PredictionScores for a single match.
 * Called automatically when a result is entered or rules change.
 */
export async function recalculateMatchScores(matchId: string): Promise<void> {
  const match = await prisma.match.findUniqueOrThrow({ where: { id: matchId } });
  if (match.homeScore === null || match.awayScore === null) return;

  const rules = await prisma.scoringRule.findMany({ where: { isActive: true } });
  const predictions = await prisma.prediction.findMany({ where: { matchId } });

  for (const prediction of predictions) {
    const scores = calculatePredictionScore(
      { id: prediction.id, homeScore: prediction.homeScore, awayScore: prediction.awayScore },
      { id: match.id, homeScore: match.homeScore, awayScore: match.awayScore },
      rules
    );

    // Upsert each score
    for (const score of scores) {
      if (score.points === 0) {
        // Delete zero-point entries to keep table clean (treat as absence)
        await prisma.predictionScore.deleteMany({
          where: { predictionId: prediction.id, ruleId: score.ruleId },
        });
      } else {
        await prisma.predictionScore.upsert({
          where: { predictionId_ruleId: { predictionId: prediction.id, ruleId: score.ruleId } },
          create: {
            predictionId: prediction.id,
            matchId,
            ruleId: score.ruleId,
            points: score.points,
          },
          update: { points: score.points, calculatedAt: new Date() },
        });
      }
    }
  }
}

/**
 * Recalculate ALL scores for ALL finished matches.
 * Used after a scoring rule change.
 */
export async function recalculateAllScores(): Promise<void> {
  const finishedMatches = await prisma.match.findMany({
    where: { status: "FINISHED", homeScore: { not: null }, awayScore: { not: null } },
    select: { id: true },
  });

  for (const match of finishedMatches) {
    await recalculateMatchScores(match.id);
  }
}
