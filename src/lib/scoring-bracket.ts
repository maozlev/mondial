// ─── Types ────────────────────────────────────────────────────────────────────

export interface GroupStandingPred {
  groupName: string;
  rank1: string;
  rank2: string;
  rank3: string;
  rank4: string;
}

export interface GroupStandingRes {
  groupName: string;
  rank1: string;
  rank2: string;
  rank3: string;
  rank4: string;
}

export interface KnockoutPred {
  stage: string;
  slot: number;
  teamName: string;
}

export interface KnockoutRes {
  stage: string;
  slot: number;
  teamName: string;
}

export interface BracketScoreResult {
  eventType: string;
  groupName?: string;
  stage?: string;
  teamName?: string;
  points: number;
}

// ─── Group standing scoring ───────────────────────────────────────────────────

const GROUP_POINTS: Record<string, number> = {
  group_rank1: 10,
  group_rank2: 7,
  group_rank3_qualified: 4,
};

/**
 * Score a user's group standing prediction against the actual result.
 * rank3_qualified: the 3rd-place team from a group only earns points if it
 * actually advanced to R32 (passed via `rank3Qualifiers` set).
 */
export function scoreGroupStanding(
  prediction: GroupStandingPred,
  result: GroupStandingRes,
  rank3Qualifiers: Set<string> = new Set()
): BracketScoreResult[] {
  const scores: BracketScoreResult[] = [];

  if (prediction.rank1 === result.rank1) {
    scores.push({
      eventType: "group_rank1",
      groupName: prediction.groupName,
      teamName: prediction.rank1,
      points: GROUP_POINTS.group_rank1,
    });
  }

  if (prediction.rank2 === result.rank2) {
    scores.push({
      eventType: "group_rank2",
      groupName: prediction.groupName,
      teamName: prediction.rank2,
      points: GROUP_POINTS.group_rank2,
    });
  }

  if (
    prediction.rank3 === result.rank3 &&
    rank3Qualifiers.has(prediction.rank3)
  ) {
    scores.push({
      eventType: "group_rank3_qualified",
      groupName: prediction.groupName,
      teamName: prediction.rank3,
      points: GROUP_POINTS.group_rank3_qualified,
    });
  }

  return scores;
}

// ─── Knockout scoring ─────────────────────────────────────────────────────────

const KNOCKOUT_POINTS: Record<string, number> = {
  R16: 3,
  QF: 5,
  SF: 10,
  FINAL: 20,
  WINNER: 40,
};

/**
 * Score knockout bracket predictions.
 * A prediction is correct if the team was predicted for that stage AND
 * a result with the same teamName exists in that stage (slot doesn't matter —
 * only that the team actually reached that round).
 */
export function scoreKnockoutPredictions(
  predictions: KnockoutPred[],
  results: KnockoutRes[]
): BracketScoreResult[] {
  const scores: BracketScoreResult[] = [];

  // Build lookup: stage → Set of team names that actually reached it
  const resultsByStage = new Map<string, Set<string>>();
  for (const r of results) {
    if (!resultsByStage.has(r.stage)) {
      resultsByStage.set(r.stage, new Set());
    }
    resultsByStage.get(r.stage)!.add(r.teamName);
  }

  for (const pred of predictions) {
    const stageResults = resultsByStage.get(pred.stage);
    if (!stageResults) continue;

    const pts = KNOCKOUT_POINTS[pred.stage];
    if (pts && stageResults.has(pred.teamName)) {
      scores.push({
        eventType: `bracket_${pred.stage.toLowerCase()}`,
        stage: pred.stage,
        teamName: pred.teamName,
        points: pts,
      });
    }
  }

  return scores;
}
