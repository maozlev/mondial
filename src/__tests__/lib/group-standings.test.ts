import { describe, expect, it } from "vitest";
import { computeGroupOrdersFromPredictions, toStandingRows, type GroupStageMatch } from "@/lib/group-standings";

function makeMatch(
  id: string,
  groupName: string,
  homeTeam: string,
  awayTeam: string
): GroupStageMatch {
  return {
    id,
    stage: "GROUP",
    groupName,
    homeTeam,
    awayTeam,
  };
}

describe("computeGroupOrdersFromPredictions", () => {
  const groupAMatches: GroupStageMatch[] = [
    makeMatch("m1", "A", "Mexico", "South Africa"),
    makeMatch("m2", "A", "South Korea", "Czech Republic"),
    makeMatch("m3", "A", "Mexico", "South Korea"),
    makeMatch("m4", "A", "South Africa", "Czech Republic"),
    makeMatch("m5", "A", "Mexico", "Czech Republic"),
    makeMatch("m6", "A", "South Africa", "South Korea"),
  ];

  it("orders teams by points then goal difference then goals scored", () => {
    const orders = computeGroupOrdersFromPredictions(groupAMatches, {
      m1: { home: 2, away: 0 },
      m2: { home: 1, away: 0 },
      m3: { home: 0, away: 1 },
      m4: { home: 1, away: 1 },
      m5: { home: 1, away: 1 },
      m6: { home: 0, away: 2 },
    });

    expect(orders.A).toEqual([
      "South Korea",
      "Mexico",
      "Czech Republic",
      "South Africa",
    ]);
  });

  it("falls back to alphabetical order when all tiebreaks are equal", () => {
    const orders = computeGroupOrdersFromPredictions(groupAMatches, {
      m1: { home: 0, away: 0 },
      m2: { home: 0, away: 0 },
      m3: { home: 0, away: 0 },
      m4: { home: 0, away: 0 },
      m5: { home: 0, away: 0 },
      m6: { home: 0, away: 0 },
    });

    expect(orders.A).toEqual([
      "Czech Republic",
      "Mexico",
      "South Africa",
      "South Korea",
    ]);
  });

  it("keeps all four teams even when only part of matches are predicted", () => {
    const orders = computeGroupOrdersFromPredictions(groupAMatches, {
      m1: { home: 3, away: 0 },
    });

    expect(orders.A).toHaveLength(4);
    expect(new Set(orders.A)).toEqual(
      new Set(["Mexico", "South Africa", "South Korea", "Czech Republic"])
    );
  });

  it("returns no standings for groups with zero predicted matches", () => {
    const orders = computeGroupOrdersFromPredictions(groupAMatches, {});
    expect(orders).toEqual({});
  });
});

describe("toStandingRows", () => {
  it("converts group order map into standings rows", () => {
    const rows = toStandingRows({
      A: ["Mexico", "South Korea", "Czech Republic", "South Africa"],
    });

    expect(rows).toEqual([
      {
        groupName: "A",
        rank1: "Mexico",
        rank2: "South Korea",
        rank3: "Czech Republic",
        rank4: "South Africa",
      },
    ]);
  });
});
