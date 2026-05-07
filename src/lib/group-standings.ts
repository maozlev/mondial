export interface GroupStageMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  stage: string;
  groupName: string | null;
}

export interface ScorePrediction {
  home: number;
  away: number;
}

interface TeamStats {
  team: string;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface StandingRow {
  groupName: string;
  rank1: string;
  rank2: string;
  rank3: string;
  rank4: string;
}

function sortTeams(a: TeamStats, b: TeamStats): number {
  const gdA = a.goalsFor - a.goalsAgainst;
  const gdB = b.goalsFor - b.goalsAgainst;
  if (a.points !== b.points) return b.points - a.points;
  if (gdA !== gdB) return gdB - gdA;
  if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
  return a.team.localeCompare(b.team, "en");
}

export function computeGroupOrdersFromPredictions(
  matches: GroupStageMatch[],
  predictions: Record<string, ScorePrediction>
): Record<string, string[]> {
  const groupMatches = matches.filter(
    (m) => m.stage === "GROUP" && typeof m.groupName === "string" && m.groupName.length > 0
  );

  const byGroup = new Map<string, GroupStageMatch[]>();
  for (const match of groupMatches) {
    const group = match.groupName as string;
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group)?.push(match);
  }

  const result: Record<string, string[]> = {};

  for (const [groupName, items] of byGroup.entries()) {
    const stats = new Map<string, TeamStats>();
    let hasPredictedMatch = false;

    const ensureTeam = (team: string) => {
      if (!stats.has(team)) {
        stats.set(team, { team, points: 0, goalsFor: 0, goalsAgainst: 0 });
      }
    };

    for (const match of items) {
      ensureTeam(match.homeTeam);
      ensureTeam(match.awayTeam);
    }

    for (const match of items) {
      const score = predictions[match.id];
      if (!score) continue;
      hasPredictedMatch = true;

      const home = stats.get(match.homeTeam);
      const away = stats.get(match.awayTeam);
      if (!home || !away) continue;

      home.goalsFor += score.home;
      home.goalsAgainst += score.away;
      away.goalsFor += score.away;
      away.goalsAgainst += score.home;

      if (score.home > score.away) {
        home.points += 3;
      } else if (score.home < score.away) {
        away.points += 3;
      } else {
        home.points += 1;
        away.points += 1;
      }
    }

    if (hasPredictedMatch) {
      result[groupName] = [...stats.values()].sort(sortTeams).map((s) => s.team);
    }
  }

  return result;
}

export function toStandingRows(groupOrders: Record<string, string[]>): StandingRow[] {
  return Object.entries(groupOrders)
    .filter(([, teams]) => teams.length >= 4)
    .map(([groupName, teams]) => ({
      groupName,
      rank1: teams[0],
      rank2: teams[1],
      rank3: teams[2],
      rank4: teams[3],
    }));
}
