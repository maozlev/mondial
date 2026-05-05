import { describe, it, expect } from "vitest";
import { buildLeaderboard, LeaderboardMode } from "@/lib/leaderboard";
import type { UserVersionScore } from "@/lib/leaderboard";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeScores(
  userId: string,
  name: string,
  v1: number,
  v2: number,
  v3: number
): UserVersionScore {
  return {
    userId,
    name,
    image: null,
    versionPoints: { 1: v1, 2: v2, 3: v3 },
  };
}

// ─── SEPARATE mode ────────────────────────────────────────────────────────────

describe("buildLeaderboard — SEPARATE mode", () => {
  it("produces one row per user per version (3 rows per user)", () => {
    const data = [makeScores("u1", "Alice", 10, 20, 5)];
    const rows = buildLeaderboard(data, LeaderboardMode.SEPARATE);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.version)).toEqual([1, 2, 3]);
  });

  it("ranks are correct within each version", () => {
    const data = [
      makeScores("u1", "Alice", 30, 20, 10),
      makeScores("u2", "Bob", 25, 35, 15),
    ];
    const rows = buildLeaderboard(data, LeaderboardMode.SEPARATE);
    // Version 1: Alice 30 (#1), Bob 25 (#2)
    const v1 = rows.filter((r) => r.version === 1).sort((a, b) => a.rank - b.rank);
    expect(v1[0].name).toBe("Alice");
    expect(v1[1].name).toBe("Bob");
    // Version 2: Bob 35 (#1), Alice 20 (#2)
    const v2 = rows.filter((r) => r.version === 2).sort((a, b) => a.rank - b.rank);
    expect(v2[0].name).toBe("Bob");
    expect(v2[1].name).toBe("Alice");
  });
});

// ─── BEST mode ────────────────────────────────────────────────────────────────

describe("buildLeaderboard — BEST mode", () => {
  it("uses the highest version score for each user", () => {
    const data = [
      makeScores("u1", "Alice", 10, 30, 20),
      makeScores("u2", "Bob", 25, 22, 18),
    ];
    const rows = buildLeaderboard(data, LeaderboardMode.BEST);
    expect(rows).toHaveLength(2);
    const alice = rows.find((r) => r.name === "Alice")!;
    const bob = rows.find((r) => r.name === "Bob")!;
    expect(alice.totalPoints).toBe(30); // best is version 2
    expect(bob.totalPoints).toBe(25);   // best is version 1
  });

  it("ranks users by their best version score descending", () => {
    const data = [
      makeScores("u1", "Alice", 10, 30, 20),
      makeScores("u2", "Bob", 40, 5, 5),
    ];
    const rows = buildLeaderboard(data, LeaderboardMode.BEST);
    const sorted = [...rows].sort((a, b) => a.rank - b.rank);
    expect(sorted[0].name).toBe("Bob");  // 40
    expect(sorted[1].name).toBe("Alice"); // 30
  });
});

// ─── SUM mode ─────────────────────────────────────────────────────────────────

describe("buildLeaderboard — SUM mode", () => {
  it("sums all version scores for each user", () => {
    const data = [makeScores("u1", "Alice", 10, 20, 30)];
    const rows = buildLeaderboard(data, LeaderboardMode.SUM);
    expect(rows[0].totalPoints).toBe(60);
  });

  it("ranks users by sum descending", () => {
    const data = [
      makeScores("u1", "Alice", 10, 10, 10), // sum = 30
      makeScores("u2", "Bob", 20, 20, 20),   // sum = 60
    ];
    const rows = buildLeaderboard(data, LeaderboardMode.SUM);
    const sorted = [...rows].sort((a, b) => a.rank - b.rank);
    expect(sorted[0].name).toBe("Bob");
    expect(sorted[1].name).toBe("Alice");
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("buildLeaderboard — edge cases", () => {
  it("returns empty array for empty input", () => {
    expect(buildLeaderboard([], LeaderboardMode.SUM)).toEqual([]);
  });

  it("handles ties with equal rank", () => {
    const data = [
      makeScores("u1", "Alice", 20, 0, 0),
      makeScores("u2", "Bob", 20, 0, 0),
    ];
    const rows = buildLeaderboard(data, LeaderboardMode.BEST);
    expect(rows[0].rank).toBe(rows[1].rank);
  });
});
