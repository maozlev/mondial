// ─── Types ────────────────────────────────────────────────────────────────────
// Lightweight types for pure scoring logic (no DB dependency)

export interface Match {
  id: string;
  homeScore: number;
  awayScore: number;
}

export interface Prediction {
  id: string;
  homeScore: number;
  awayScore: number;
}

export interface ScoringRule {
  id: string;
  eventType: string;
  name: string;
  nameHe: string;
  points: number;
  isActive: boolean;
  order: number;
}

export interface PredictionScoreResult {
  predictionId: string;
  matchId: string;
  ruleId: string;
  points: number;
}

// ─── Outcome helpers ──────────────────────────────────────────────────────────

type Outcome = "home" | "away" | "draw";

function outcome(homeScore: number, awayScore: number): Outcome {
  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  return "draw";
}

// ─── Individual evaluators ────────────────────────────────────────────────────

/** Predicted the correct winner (home / away / draw) */
export function evaluateWinnerCorrect(
  prediction: Prediction,
  match: Match
): boolean {
  return (
    outcome(prediction.homeScore, prediction.awayScore) ===
    outcome(match.homeScore, match.awayScore)
  );
}

/** Predicted the exact scoreline */
export function evaluateExactScore(
  prediction: Prediction,
  match: Match
): boolean {
  return (
    prediction.homeScore === match.homeScore &&
    prediction.awayScore === match.awayScore
  );
}

/** Both the prediction AND the result are draws */
export function evaluateDrawCorrect(
  prediction: Prediction,
  match: Match
): boolean {
  return (
    outcome(prediction.homeScore, prediction.awayScore) === "draw" &&
    outcome(match.homeScore, match.awayScore) === "draw"
  );
}

/** The prediction itself is a draw (regardless of match outcome) */
export function evaluateDrawPredicted(
  prediction: Prediction,
  _match: Match
): boolean {
  return outcome(prediction.homeScore, prediction.awayScore) === "draw";
}

/**
 * Predicted the correct loser (non-draw outcomes only).
 * e.g. predicted 3-0 (home wins, away loses) → result 1-0 (home wins, away loses) → true
 * e.g. predicted 3-0 (home wins, away loses) → result 0-2 (away wins, home loses) → false
 */
export function evaluateLoserCorrect(
  prediction: Prediction,
  match: Match
): boolean {
  const predOutcome = outcome(prediction.homeScore, prediction.awayScore);
  const matchOutcome = outcome(match.homeScore, match.awayScore);
  // No loser in a draw
  if (predOutcome === "draw" || matchOutcome === "draw") return false;
  // Loser is the team that didn't win — same in both
  const predLoser = predOutcome === "home" ? "away" : "home";
  const matchLoser = matchOutcome === "home" ? "away" : "home";
  return predLoser === matchLoser;
}

// ─── Evaluator registry ───────────────────────────────────────────────────────
// Add new eventTypes here without changing calculatePredictionScore.

type Evaluator = (prediction: Prediction, match: Match) => boolean;

const evaluators: Record<string, Evaluator> = {
  winner_correct: evaluateWinnerCorrect,
  exact_score: evaluateExactScore,
  draw_correct: evaluateDrawCorrect,
  draw_predicted: evaluateDrawPredicted,
  loser_correct: evaluateLoserCorrect,
};

// ─── Main engine ──────────────────────────────────────────────────────────────

/**
 * Calculate all scoring rule results for a single prediction against a match result.
 * Returns one PredictionScoreResult per rule (points = 0 for unmatched or inactive rules).
 */
export function calculatePredictionScore(
  prediction: Prediction,
  match: Match,
  rules: ScoringRule[]
): PredictionScoreResult[] {
  return rules.map((rule) => {
    let points = 0;
    if (rule.isActive) {
      const evaluator = evaluators[rule.eventType];
      if (evaluator && evaluator(prediction, match)) {
        points = rule.points;
      }
    }
    return {
      predictionId: prediction.id,
      matchId: match.id,
      ruleId: rule.id,
      points,
    };
  });
}
