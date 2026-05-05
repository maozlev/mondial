import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { MatchStage, MatchStatus } from "@prisma/client";

const FOOTBALL_DATA_API = "https://api.football-data.org/v4";
const WC_2026_COMPETITION = "WC"; // World Cup

// Maps football-data.org stage names to our MatchStage enum
const STAGE_MAP: Record<string, MatchStage> = {
  "GROUP_STAGE": MatchStage.GROUP,
  "ROUND_OF_32": MatchStage.R32,
  "LAST_16": MatchStage.R16,
  "QUARTER_FINALS": MatchStage.QF,
  "SEMI_FINALS": MatchStage.SF,
  "THIRD_PLACE": MatchStage.THIRD,
  "FINAL": MatchStage.FINAL,
};

export async function POST() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FOOTBALL_DATA_API_KEY not configured" }, { status: 500 });
  }

  const res = await fetch(
    `${FOOTBALL_DATA_API}/competitions/${WC_2026_COMPETITION}/matches`,
    { headers: { "X-Auth-Token": apiKey } }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `API error: ${res.status}`, detail: text }, { status: 502 });
  }

  const json = await res.json();
  const matches = json.matches ?? [];

  let created = 0;
  let skipped = 0;

  for (const m of matches) {
    const stage = STAGE_MAP[m.stage];
    if (!stage) { skipped++; continue; }

    const externalId = String(m.id);
    const existing = await prisma.match.findUnique({ where: { externalId } });
    if (existing) { skipped++; continue; }

    await prisma.match.create({
      data: {
        homeTeam: m.homeTeam?.name ?? "TBD",
        awayTeam: m.awayTeam?.name ?? "TBD",
        stage,
        groupName: m.group ? String(m.group).replace("GROUP_", "") : null,
        scheduledAt: new Date(m.utcDate),
        status: MatchStatus.UPCOMING,
        externalId,
      },
    });
    created++;
  }

  return NextResponse.json({ created, skipped });
}
