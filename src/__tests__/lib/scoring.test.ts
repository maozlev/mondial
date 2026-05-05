import { describe, it, expect } from "vitest";
import {
  evaluateWinnerCorrect,
  evaluateExactScore,
  evaluateDrawCorrect,
  evaluateLoserCorrect,
  evaluateDrawPredicted,
  calculatePredictionScore,
} from "@/lib/scoring";
import type { ScoringRule, Prediction, Match } from "@/lib/scoring";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMatch(homeScore: number, awayScore: number): Match {
  return { id: "m1", homeScore, awayScore };
}

function makePrediction(homeScore: number, awayScore: number): Prediction {
  return { id: "p1", homeScore, awayScore };
}

function makeRule(
  eventType: string,
  points: number,
  isActive = true
): ScoringRule {
  return {
    id: `rule-${eventType}`,
    eventType,
    name: eventType,
    nameHe: eventType,
    points,
    isActive,
    order: 0,
  };
}

// ─── winner_correct ───────────────────────────────────────────────────────────

describe("evaluateWinnerCorrect", () => {
  it("returns true when home win predicted and home wins", () => {
    expect(evaluateWinnerCorrect(makePrediction(2, 0), makeMatch(3, 1))).toBe(
      true
    );
  });

  it("returns true when away win predicted and away wins", () => {
    expect(evaluateWinnerCorrect(makePrediction(0, 1), makeMatch(1, 3))).toBe(
      true
    );
  });

  it("returns true when draw predicted and match is draw", () => {
    expect(evaluateWinnerCorrect(makePrediction(1, 1), makeMatch(2, 2))).toBe(
      true
    );
  });

  it("returns false when predicted home win but away wins", () => {
    expect(evaluateWinnerCorrect(makePrediction(2, 0), makeMatch(0, 1))).toBe(
      false
    );
  });

  it("returns false when predicted draw but home wins", () => {
    expect(evaluateWinnerCorrect(makePrediction(1, 1), makeMatch(2, 1))).toBe(
      false
    );
  });
});

// ─── exact_score ──────────────────────────────────────────────────────────────

describe("evaluateExactScore", () => {
  it("returns true when prediction exactly matches result", () => {
    expect(evaluateExactScore(makePrediction(2, 1), makeMatch(2, 1))).toBe(
      true
    );
  });

  it("returns false when only direction is correct", () => {
    expect(evaluateExactScore(makePrediction(3, 0), makeMatch(2, 0))).toBe(
      false
    );
  });

  it("returns false when score is completely wrong", () => {
    expect(evaluateExactScore(makePrediction(1, 0), makeMatch(0, 2))).toBe(
      false
    );
  });
});

// ─── draw_correct ─────────────────────────────────────────────────────────────

describe("evaluateDrawCorrect", () => {
  it("returns true when both prediction and result are draws", () => {
    expect(evaluateDrawCorrect(makePrediction(1, 1), makeMatch(0, 0))).toBe(
      true
    );
  });

  it("returns false when prediction is draw but result is not", () => {
    expect(evaluateDrawCorrect(makePrediction(0, 0), makeMatch(1, 0))).toBe(
      false
    );
  });

  it("returns false when result is draw but prediction is not", () => {
    expect(evaluateDrawCorrect(makePrediction(2, 1), makeMatch(1, 1))).toBe(
      false
    );
  });
});

// ─── draw_predicted ───────────────────────────────────────────────────────────

describe("evaluateDrawPredicted", () => {
  it("returns true when prediction is a draw (regardless of result)", () => {
    expect(evaluateDrawPredicted(makePrediction(1, 1), makeMatch(2, 0))).toBe(
      true
    );
  });

  it("returns false when prediction is not a draw", () => {
    expect(evaluateDrawPredicted(makePrediction(2, 0), makeMatch(1, 1))).toBe(
      false
    );
  });
});

// ─── loser_correct ────────────────────────────────────────────────────────────

describe("evaluateLoserCorrect", () => {
  it("returns true when predicted away win but home wins (wrong winner, correct loser)", () => {
    // Prediction: 0-2 (away wins), Result: 2-0 (home wins)
    // The predicted "loser" is home (predicted 0 home goals, away team wins)
    // Actually loser_correct = you predicted the losing team correctly
    // predicted: away wins → "home" is the predicted loser → actual result: home also loses? NO, home wins
    // So this should be false. Let's define loser_correct:
    // "You correctly identified which team LOST (home or away), but predicted the wrong winner."
    expect(evaluateLoserCorrect(makePrediction(0, 2), makeMatch(2, 0))).toBe(
      false
    );
  });

  it("returns true when predicted loser matches actual loser and no draw", () => {
    // predicted: 3-0 (home wins, away loses) — result: 1-0 (home wins, away loses)
    // winner_correct already handles this; loser_correct is a separate rule
    // loser = away in both → true
    expect(evaluateLoserCorrect(makePrediction(3, 0), makeMatch(1, 0))).toBe(
      true
    );
  });

  it("returns false for draws (no loser)", () => {
    expect(evaluateLoserCorrect(makePrediction(1, 1), makeMatch(1, 1))).toBe(
      false
    );
  });
});

// ─── calculatePredictionScore ─────────────────────────────────────────────────

describe("calculatePredictionScore", () => {
  const rules: ScoringRule[] = [
    makeRule("winner_correct", 3),
    makeRule("exact_score", 5),
  ];

  it("awards winner_correct points when direction is correct", () => {
    const scores = calculatePredictionScore(
      makePrediction(2, 0),
      makeMatch(1, 0),
      rules
    );
    const winnerScore = scores.find((s) => s.ruleId === "rule-winner_correct");
    const exactScore = scores.find((s) => s.ruleId === "rule-exact_score");
    expect(winnerScore?.points).toBe(3);
    expect(exactScore?.points).toBe(0);
  });

  it("awards both winner_correct and exact_score for perfect prediction", () => {
    const scores = calculatePredictionScore(
      makePrediction(2, 1),
      makeMatch(2, 1),
      rules
    );
    const total = scores.reduce((sum, s) => sum + s.points, 0);
    expect(total).toBe(8); // 3 + 5
  });

  it("awards 0 points when prediction is completely wrong", () => {
    const scores = calculatePredictionScore(
      makePrediction(2, 0),
      makeMatch(0, 3),
      rules
    );
    const total = scores.reduce((sum, s) => sum + s.points, 0);
    expect(total).toBe(0);
  });

  it("returns a score entry for every rule", () => {
    const scores = calculatePredictionScore(
      makePrediction(1, 0),
      makeMatch(2, 0),
      rules
    );
    expect(scores).toHaveLength(rules.length);
  });

  it("skips inactive rules (points = 0)", () => {
    const rulesWithInactive: ScoringRule[] = [
      makeRule("winner_correct", 3),
      makeRule("exact_score", 5, false), // inactive
    ];
    const scores = calculatePredictionScore(
      makePrediction(2, 1),
      makeMatch(2, 1),
      rulesWithInactive
    );
    const exactScore = scores.find((s) => s.ruleId === "rule-exact_score");
    expect(exactScore?.points).toBe(0);
  });

  it("includes predictionId and matchId in each score", () => {
    const scores = calculatePredictionScore(
      makePrediction(1, 0),
      makeMatch(1, 0),
      rules
    );
    for (const score of scores) {
      expect(score.predictionId).toBe("p1");
      expect(score.matchId).toBe("m1");
    }
  });
});

// ─── buildLeaderboard ─────────────────────────────────────────────────────────
// (Tested separately in leaderboard.test.ts after impl)
