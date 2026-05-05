export enum LeaderboardMode {
  SEPARATE = "SEPARATE",
  BEST = "BEST",
  SUM = "SUM",
}

export interface UserVersionScore {
  userId: string;
  name: string | null;
  image: string | null;
  versionPoints: Record<1 | 2 | 3, number>;
}

export interface LeaderboardRow {
  userId: string;
  name: string | null;
  image: string | null;
  rank: number;
  totalPoints: number;
  version?: number; // only used in SEPARATE mode
}

export function buildLeaderboard(
  data: UserVersionScore[],
  mode: LeaderboardMode
): LeaderboardRow[] {
  if (data.length === 0) return [];

  if (mode === LeaderboardMode.SEPARATE) {
    const rows: LeaderboardRow[] = [];
    for (const version of [1, 2, 3] as const) {
      const versionRows = data
        .map((u) => ({
          userId: u.userId,
          name: u.name,
          image: u.image,
          totalPoints: u.versionPoints[version],
          version,
          rank: 0,
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints);
      assignRanks(versionRows);
      rows.push(...versionRows);
    }
    return rows;
  }

  if (mode === LeaderboardMode.BEST) {
    const rows = data
      .map((u) => ({
        userId: u.userId,
        name: u.name,
        image: u.image,
        totalPoints: Math.max(
          u.versionPoints[1],
          u.versionPoints[2],
          u.versionPoints[3]
        ),
        rank: 0,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
    assignRanks(rows);
    return rows;
  }

  // SUM mode
  const rows = data
    .map((u) => ({
      userId: u.userId,
      name: u.name,
      image: u.image,
      totalPoints:
        u.versionPoints[1] + u.versionPoints[2] + u.versionPoints[3],
      rank: 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
  assignRanks(rows);
  return rows;
}

function assignRanks(rows: { rank: number; totalPoints: number }[]): void {
  let rank = 1;
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && rows[i].totalPoints < rows[i - 1].totalPoints) {
      rank = i + 1;
    }
    rows[i].rank = rank;
  }
}
