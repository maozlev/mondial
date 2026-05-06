import { describe, it, expect } from "vitest";
import {
  scoreGroupStanding,
  scoreKnockoutPredictions,
  type GroupStandingPred,
  type GroupStandingRes,
  type KnockoutPred,
  type KnockoutRes,
} from "@/lib/scoring-bracket";

// ─── Group Standing Scoring ───────────────────────────────────────────────────

describe("scoreGroupStanding", () => {
  const result: GroupStandingRes = {
    groupName: "A",
    rank1: "Argentina",
    rank2: "Brazil",
    rank3: "Uruguay",
    rank4: "Chile",
  };

  it("awards 10 points for correct rank1", () => {
    const pred: GroupStandingPred = {
      groupName: "A",
      rank1: "Argentina",
      rank2: "Chile",
      rank3: "Chile",
      rank4: "Uruguay",
    };
    const scores = scoreGroupStanding(pred, result);
    const rank1Score = scores.find((s) => s.eventType === "group_rank1");
    expect(rank1Score?.points).toBe(10);
  });

  it("awards 7 points for correct rank2", () => {
    const pred: GroupStandingPred = {
      groupName: "A",
      rank1: "Chile",
      rank2: "Brazil",
      rank3: "Chile",
      rank4: "Uruguay",
    };
    const scores = scoreGroupStanding(pred, result);
    const rank2Score = scores.find((s) => s.eventType === "group_rank2");
    expect(rank2Score?.points).toBe(7);
  });

  it("awards 4 points for correct rank3 when team is a rank3 qualifier", () => {
    const pred: GroupStandingPred = {
      groupName: "A",
      rank1: "Chile",
      rank2: "Chile",
      rank3: "Uruguay",
      rank4: "Chile",
    };
    const qualifiers = new Set(["Uruguay"]);
    const scores = scoreGroupStanding(pred, result, qualifiers);
    const rank3Score = scores.find(
      (s) => s.eventType === "group_rank3_qualified"
    );
    expect(rank3Score?.points).toBe(4);
  });

  it("does NOT award rank3 points if team did not qualify", () => {
    const pred: GroupStandingPred = {
      groupName: "A",
      rank1: "Chile",
      rank2: "Chile",
      rank3: "Uruguay",
      rank4: "Chile",
    };
    const qualifiers = new Set<string>([]); // Uruguay did NOT qualify
    const scores = scoreGroupStanding(pred, result, qualifiers);
    const rank3Score = scores.find(
      (s) => s.eventType === "group_rank3_qualified"
    );
    expect(rank3Score).toBeUndefined();
  });

  it("returns empty array when all picks are wrong", () => {
    const pred: GroupStandingPred = {
      groupName: "A",
      rank1: "Chile",
      rank2: "Uruguay",
      rank3: "Brazil",
      rank4: "Argentina",
    };
    const scores = scoreGroupStanding(pred, result);
    expect(scores).toHaveLength(0);
  });

  it("awards all 3 scores when rank1, rank2, and rank3 (qualified) are correct", () => {
    const pred: GroupStandingPred = {
      groupName: "A",
      rank1: "Argentina",
      rank2: "Brazil",
      rank3: "Uruguay",
      rank4: "Chile",
    };
    const qualifiers = new Set(["Uruguay"]);
    const scores = scoreGroupStanding(pred, result, qualifiers);
    expect(scores).toHaveLength(3);
    const total = scores.reduce((s, r) => s + r.points, 0);
    expect(total).toBe(10 + 7 + 4);
  });

  it("includes groupName in score results", () => {
    const pred: GroupStandingPred = {
      groupName: "A",
      rank1: "Argentina",
      rank2: "Chile",
      rank3: "Chile",
      rank4: "Uruguay",
    };
    const scores = scoreGroupStanding(pred, result);
    expect(scores[0].groupName).toBe("A");
  });
});

// ─── Knockout Scoring ─────────────────────────────────────────────────────────

describe("scoreKnockoutPredictions", () => {
  const results: KnockoutRes[] = [
    { stage: "QF", slot: 1, teamName: "France" },
    { stage: "QF", slot: 2, teamName: "Germany" },
    { stage: "QF", slot: 3, teamName: "Brazil" },
    { stage: "QF", slot: 4, teamName: "Argentina" },
    { stage: "QF", slot: 5, teamName: "England" },
    { stage: "QF", slot: 6, teamName: "Spain" },
    { stage: "QF", slot: 7, teamName: "Portugal" },
    { stage: "QF", slot: 8, teamName: "Netherlands" },
    { stage: "SF", slot: 1, teamName: "France" },
    { stage: "SF", slot: 2, teamName: "Brazil" },
    { stage: "SF", slot: 3, teamName: "Spain" },
    { stage: "SF", slot: 4, teamName: "Argentina" },
    { stage: "FINAL", slot: 1, teamName: "Brazil" },
    { stage: "FINAL", slot: 2, teamName: "Argentina" },
    { stage: "WINNER", slot: 1, teamName: "Argentina" },
  ];

  it("awards 5 points per correct QF team", () => {
    const preds: KnockoutPred[] = [
      { stage: "QF", slot: 1, teamName: "France" },
      { stage: "QF", slot: 2, teamName: "Germany" },
    ];
    const scores = scoreKnockoutPredictions(preds, results);
    expect(scores).toHaveLength(2);
    expect(scores.every((s) => s.points === 5)).toBe(true);
  });

  it("awards 10 points per correct SF team", () => {
    const preds: KnockoutPred[] = [
      { stage: "SF", slot: 1, teamName: "France" },
      { stage: "SF", slot: 2, teamName: "Brazil" },
    ];
    const scores = scoreKnockoutPredictions(preds, results);
    expect(scores).toHaveLength(2);
    expect(scores.every((s) => s.points === 10)).toBe(true);
  });

  it("awards 20 points per correct finalist", () => {
    const preds: KnockoutPred[] = [
      { stage: "FINAL", slot: 1, teamName: "Brazil" },
      { stage: "FINAL", slot: 2, teamName: "Argentina" },
    ];
    const scores = scoreKnockoutPredictions(preds, results);
    expect(scores).toHaveLength(2);
    expect(scores.every((s) => s.points === 20)).toBe(true);
  });

  it("awards 40 points for correct winner", () => {
    const preds: KnockoutPred[] = [
      { stage: "WINNER", slot: 1, teamName: "Argentina" },
    ];
    const scores = scoreKnockoutPredictions(preds, results);
    expect(scores).toHaveLength(1);
    expect(scores[0].points).toBe(40);
  });

  it("returns no scores for wrong predictions", () => {
    const preds: KnockoutPred[] = [
      { stage: "QF", slot: 1, teamName: "Croatia" },
      { stage: "WINNER", slot: 1, teamName: "Japan" },
    ];
    const scores = scoreKnockoutPredictions(preds, results);
    expect(scores).toHaveLength(0);
  });

  it("slot position doesn't matter — only team reaching stage matters", () => {
    // France is in QF slot 1 in results, but user predicted France in QF slot 5
    const preds: KnockoutPred[] = [
      { stage: "QF", slot: 5, teamName: "France" },
    ];
    const scores = scoreKnockoutPredictions(preds, results);
    expect(scores).toHaveLength(1);
    expect(scores[0].points).toBe(5);
  });

  it("returns empty when no results exist yet", () => {
    const preds: KnockoutPred[] = [
      { stage: "QF", slot: 1, teamName: "France" },
    ];
    const scores = scoreKnockoutPredictions(preds, []);
    expect(scores).toHaveLength(0);
  });

  it("returns empty when predictions is empty", () => {
    const scores = scoreKnockoutPredictions([], results);
    expect(scores).toHaveLength(0);
  });

  it("returns correct eventType strings", () => {
    const preds: KnockoutPred[] = [
      { stage: "QF", slot: 1, teamName: "France" },
      { stage: "SF", slot: 1, teamName: "France" },
      { stage: "FINAL", slot: 1, teamName: "Brazil" },
      { stage: "WINNER", slot: 1, teamName: "Argentina" },
    ];
    const scores = scoreKnockoutPredictions(preds, results);
    const types = scores.map((s) => s.eventType);
    expect(types).toContain("bracket_qf");
    expect(types).toContain("bracket_sf");
    expect(types).toContain("bracket_final");
    expect(types).toContain("bracket_winner");
  });

  it("scores a full perfect bracket correctly", () => {
    const perfectPreds: KnockoutPred[] = [
      { stage: "QF", slot: 1, teamName: "France" },
      { stage: "QF", slot: 2, teamName: "Germany" },
      { stage: "QF", slot: 3, teamName: "Brazil" },
      { stage: "QF", slot: 4, teamName: "Argentina" },
      { stage: "QF", slot: 5, teamName: "England" },
      { stage: "QF", slot: 6, teamName: "Spain" },
      { stage: "QF", slot: 7, teamName: "Portugal" },
      { stage: "QF", slot: 8, teamName: "Netherlands" },
      { stage: "SF", slot: 1, teamName: "France" },
      { stage: "SF", slot: 2, teamName: "Brazil" },
      { stage: "SF", slot: 3, teamName: "Spain" },
      { stage: "SF", slot: 4, teamName: "Argentina" },
      { stage: "FINAL", slot: 1, teamName: "Brazil" },
      { stage: "FINAL", slot: 2, teamName: "Argentina" },
      { stage: "WINNER", slot: 1, teamName: "Argentina" },
    ];
    const scores = scoreKnockoutPredictions(perfectPreds, results);
    const total = scores.reduce((s, r) => s + r.points, 0);
    // 8×5 + 4×10 + 2×20 + 1×40 = 40 + 40 + 40 + 40 = 160
    expect(total).toBe(160);
  });
});
