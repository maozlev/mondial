import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient, MatchStage, MatchStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DEFAULT_SCORING_RULES = [
  { eventType: "winner_correct", name: "Correct winner", nameHe: "ניחוש מנצח נכון", points: 3, order: 1 },
  { eventType: "exact_score", name: "Exact score", nameHe: "תוצאה מדויקת", points: 5, order: 2 },
  { eventType: "draw_correct", name: "Correct draw", nameHe: "ניחש תיקו ויצא תיקו", points: 2, order: 3 },
  { eventType: "loser_correct", name: "Correct loser", nameHe: "ניחוש מפסיד נכון", points: 1, order: 4 },
];

const DEFAULT_SETTINGS = [
  { key: "leaderboard_mode", value: "SEPARATE" },
  { key: "predictions_locked", value: "false" },
];

// 2026 FIFA World Cup – all 72 group stage matches
// Times are UTC. MD3 pairs within each group are simultaneous.
// Groups: A-L, 4 teams each, 6 matches per group = 72 total.
const GROUP_MATCHES = [
  // ── Group A: Mexico, South Africa, South Korea, Czech Republic ──────────────
  // MD1
  { homeTeam: "Mexico",       awayTeam: "South Africa",   groupName: "A", scheduledAt: new Date("2026-06-11T19:00:00Z") },
  { homeTeam: "South Korea",  awayTeam: "Czech Republic",  groupName: "A", scheduledAt: new Date("2026-06-12T02:00:00Z") },
  // MD2
  { homeTeam: "Czech Republic", awayTeam: "South Africa",  groupName: "A", scheduledAt: new Date("2026-06-18T16:00:00Z") },
  { homeTeam: "Mexico",       awayTeam: "South Korea",     groupName: "A", scheduledAt: new Date("2026-06-18T22:00:00Z") },
  // MD3 (simultaneous)
  { homeTeam: "Mexico",       awayTeam: "Czech Republic",  groupName: "A", scheduledAt: new Date("2026-06-25T01:00:00Z") },
  { homeTeam: "South Africa", awayTeam: "South Korea",     groupName: "A", scheduledAt: new Date("2026-06-25T01:00:00Z") },

  // ── Group B: Canada, Bosnia and Herzegovina, Qatar, Switzerland ─────────────
  // MD1
  { homeTeam: "Canada",       awayTeam: "Bosnia and Herzegovina", groupName: "B", scheduledAt: new Date("2026-06-12T19:00:00Z") },
  { homeTeam: "Qatar",        awayTeam: "Switzerland",     groupName: "B", scheduledAt: new Date("2026-06-13T19:00:00Z") },
  // MD2
  { homeTeam: "Canada",       awayTeam: "Qatar",           groupName: "B", scheduledAt: new Date("2026-06-18T20:00:00Z") },
  { homeTeam: "Switzerland",  awayTeam: "Bosnia and Herzegovina", groupName: "B", scheduledAt: new Date("2026-06-18T19:00:00Z") },
  // MD3 (simultaneous)
  { homeTeam: "Canada",       awayTeam: "Switzerland",     groupName: "B", scheduledAt: new Date("2026-06-24T19:00:00Z") },
  { homeTeam: "Bosnia and Herzegovina", awayTeam: "Qatar", groupName: "B", scheduledAt: new Date("2026-06-24T19:00:00Z") },

  // ── Group C: Brazil, Morocco, Haiti, Scotland ───────────────────────────────
  // MD1
  { homeTeam: "Brazil",       awayTeam: "Morocco",         groupName: "C", scheduledAt: new Date("2026-06-13T22:00:00Z") },
  { homeTeam: "Haiti",        awayTeam: "Scotland",        groupName: "C", scheduledAt: new Date("2026-06-14T01:00:00Z") },
  // MD2
  { homeTeam: "Scotland",     awayTeam: "Morocco",         groupName: "C", scheduledAt: new Date("2026-06-19T22:00:00Z") },
  { homeTeam: "Brazil",       awayTeam: "Haiti",           groupName: "C", scheduledAt: new Date("2026-06-20T00:30:00Z") },
  // MD3 (simultaneous)
  { homeTeam: "Scotland",     awayTeam: "Brazil",          groupName: "C", scheduledAt: new Date("2026-06-24T22:00:00Z") },
  { homeTeam: "Haiti",        awayTeam: "Morocco",         groupName: "C", scheduledAt: new Date("2026-06-24T22:00:00Z") },

  // ── Group D: United States, Paraguay, Australia, Turkey ─────────────────────
  // MD1
  { homeTeam: "United States", awayTeam: "Paraguay",       groupName: "D", scheduledAt: new Date("2026-06-13T01:00:00Z") },
  { homeTeam: "Australia",    awayTeam: "Turkey",          groupName: "D", scheduledAt: new Date("2026-06-13T04:00:00Z") },
  // MD2
  { homeTeam: "United States", awayTeam: "Australia",      groupName: "D", scheduledAt: new Date("2026-06-19T22:00:00Z") },
  { homeTeam: "Turkey",       awayTeam: "Paraguay",        groupName: "D", scheduledAt: new Date("2026-06-19T22:00:00Z") },
  // MD3 (simultaneous)
  { homeTeam: "United States", awayTeam: "Turkey",         groupName: "D", scheduledAt: new Date("2026-06-24T23:00:00Z") },
  { homeTeam: "Paraguay",     awayTeam: "Australia",       groupName: "D", scheduledAt: new Date("2026-06-24T23:00:00Z") },

  // ── Group E: Germany, Curaçao, Ivory Coast, Ecuador ─────────────────────────
  // MD1
  { homeTeam: "Germany",      awayTeam: "Curaçao",         groupName: "E", scheduledAt: new Date("2026-06-14T17:00:00Z") },
  { homeTeam: "Ivory Coast",  awayTeam: "Ecuador",         groupName: "E", scheduledAt: new Date("2026-06-15T02:00:00Z") },
  // MD2
  { homeTeam: "Germany",      awayTeam: "Ivory Coast",     groupName: "E", scheduledAt: new Date("2026-06-20T22:00:00Z") },
  { homeTeam: "Ecuador",      awayTeam: "Curaçao",         groupName: "E", scheduledAt: new Date("2026-06-21T00:00:00Z") },
  // MD3 (simultaneous)
  { homeTeam: "Germany",      awayTeam: "Ecuador",         groupName: "E", scheduledAt: new Date("2026-06-25T20:00:00Z") },
  { homeTeam: "Curaçao",      awayTeam: "Ivory Coast",     groupName: "E", scheduledAt: new Date("2026-06-25T20:00:00Z") },

  // ── Group F: Netherlands, Japan, Sweden, Tunisia ────────────────────────────
  // MD1
  { homeTeam: "Netherlands",  awayTeam: "Japan",           groupName: "F", scheduledAt: new Date("2026-06-14T20:00:00Z") },
  { homeTeam: "Sweden",       awayTeam: "Tunisia",         groupName: "F", scheduledAt: new Date("2026-06-15T02:00:00Z") },
  // MD2
  { homeTeam: "Netherlands",  awayTeam: "Sweden",          groupName: "F", scheduledAt: new Date("2026-06-20T17:00:00Z") },
  { homeTeam: "Tunisia",      awayTeam: "Japan",           groupName: "F", scheduledAt: new Date("2026-06-21T04:00:00Z") },
  // MD3 (simultaneous)
  { homeTeam: "Japan",        awayTeam: "Sweden",          groupName: "F", scheduledAt: new Date("2026-06-25T23:00:00Z") },
  { homeTeam: "Netherlands",  awayTeam: "Tunisia",         groupName: "F", scheduledAt: new Date("2026-06-25T23:00:00Z") },

  // ── Group G: Belgium, Egypt, Iran, New Zealand ──────────────────────────────
  // MD1
  { homeTeam: "Belgium",      awayTeam: "Egypt",           groupName: "G", scheduledAt: new Date("2026-06-15T19:00:00Z") },
  { homeTeam: "Iran",         awayTeam: "New Zealand",     groupName: "G", scheduledAt: new Date("2026-06-15T22:00:00Z") },
  // MD2
  { homeTeam: "Belgium",      awayTeam: "Iran",            groupName: "G", scheduledAt: new Date("2026-06-21T19:00:00Z") },
  { homeTeam: "New Zealand",  awayTeam: "Egypt",           groupName: "G", scheduledAt: new Date("2026-06-21T22:00:00Z") },
  // MD3 (simultaneous)
  { homeTeam: "Belgium",      awayTeam: "New Zealand",     groupName: "G", scheduledAt: new Date("2026-06-26T20:00:00Z") },
  { homeTeam: "Egypt",        awayTeam: "Iran",            groupName: "G", scheduledAt: new Date("2026-06-26T20:00:00Z") },

  // ── Group H: Spain, Cape Verde, Saudi Arabia, Uruguay ───────────────────────
  // MD1
  { homeTeam: "Spain",        awayTeam: "Cape Verde",      groupName: "H", scheduledAt: new Date("2026-06-15T16:00:00Z") },
  { homeTeam: "Saudi Arabia", awayTeam: "Uruguay",         groupName: "H", scheduledAt: new Date("2026-06-15T20:00:00Z") },
  // MD2
  { homeTeam: "Spain",        awayTeam: "Saudi Arabia",    groupName: "H", scheduledAt: new Date("2026-06-21T16:00:00Z") },
  { homeTeam: "Uruguay",      awayTeam: "Cape Verde",      groupName: "H", scheduledAt: new Date("2026-06-21T22:00:00Z") },
  // MD3 (simultaneous) — local June 26, UTC June 27
  { homeTeam: "Cape Verde",   awayTeam: "Saudi Arabia",    groupName: "H", scheduledAt: new Date("2026-06-27T00:00:00Z") },
  { homeTeam: "Uruguay",      awayTeam: "Spain",           groupName: "H", scheduledAt: new Date("2026-06-27T00:00:00Z") },

  // ── Group I: France, Senegal, Iraq, Norway ──────────────────────────────────
  // MD1
  { homeTeam: "France",       awayTeam: "Senegal",         groupName: "I", scheduledAt: new Date("2026-06-16T19:00:00Z") },
  { homeTeam: "Iraq",         awayTeam: "Norway",          groupName: "I", scheduledAt: new Date("2026-06-16T22:00:00Z") },
  // MD2
  { homeTeam: "France",       awayTeam: "Iraq",            groupName: "I", scheduledAt: new Date("2026-06-22T19:00:00Z") },
  { homeTeam: "Senegal",      awayTeam: "Norway",          groupName: "I", scheduledAt: new Date("2026-06-22T22:00:00Z") },
  // MD3 (simultaneous)
  { homeTeam: "France",       awayTeam: "Norway",          groupName: "I", scheduledAt: new Date("2026-06-26T19:00:00Z") },
  { homeTeam: "Senegal",      awayTeam: "Iraq",            groupName: "I", scheduledAt: new Date("2026-06-26T19:00:00Z") },

  // ── Group J: Argentina, Algeria, Austria, Jordan ────────────────────────────
  // MD1 — local June 16, UTC June 17
  { homeTeam: "Argentina",    awayTeam: "Algeria",         groupName: "J", scheduledAt: new Date("2026-06-17T01:00:00Z") },
  { homeTeam: "Austria",      awayTeam: "Jordan",          groupName: "J", scheduledAt: new Date("2026-06-17T04:00:00Z") },
  // MD2
  { homeTeam: "Argentina",    awayTeam: "Austria",         groupName: "J", scheduledAt: new Date("2026-06-22T17:00:00Z") },
  { homeTeam: "Jordan",       awayTeam: "Algeria",         groupName: "J", scheduledAt: new Date("2026-06-23T03:00:00Z") },
  // MD3 (simultaneous) — local June 27, UTC June 28
  { homeTeam: "Argentina",    awayTeam: "Jordan",          groupName: "J", scheduledAt: new Date("2026-06-28T02:00:00Z") },
  { homeTeam: "Algeria",      awayTeam: "Austria",         groupName: "J", scheduledAt: new Date("2026-06-28T02:00:00Z") },

  // ── Group K: Portugal, DR Congo, Uzbekistan, Colombia ───────────────────────
  // MD1
  { homeTeam: "Portugal",     awayTeam: "DR Congo",        groupName: "K", scheduledAt: new Date("2026-06-17T17:00:00Z") },
  { homeTeam: "Uzbekistan",   awayTeam: "Colombia",        groupName: "K", scheduledAt: new Date("2026-06-18T02:00:00Z") },
  // MD2
  { homeTeam: "Portugal",     awayTeam: "Uzbekistan",      groupName: "K", scheduledAt: new Date("2026-06-23T17:00:00Z") },
  { homeTeam: "DR Congo",     awayTeam: "Colombia",        groupName: "K", scheduledAt: new Date("2026-06-23T20:00:00Z") },
  // MD3 (simultaneous)
  { homeTeam: "Portugal",     awayTeam: "Colombia",        groupName: "K", scheduledAt: new Date("2026-06-27T23:30:00Z") },
  { homeTeam: "DR Congo",     awayTeam: "Uzbekistan",      groupName: "K", scheduledAt: new Date("2026-06-27T23:30:00Z") },

  // ── Group L: England, Croatia, Ghana, Panama ────────────────────────────────
  // MD1
  { homeTeam: "England",      awayTeam: "Croatia",         groupName: "L", scheduledAt: new Date("2026-06-17T20:00:00Z") },
  { homeTeam: "Ghana",        awayTeam: "Panama",          groupName: "L", scheduledAt: new Date("2026-06-17T23:00:00Z") },
  // MD2
  { homeTeam: "England",      awayTeam: "Ghana",           groupName: "L", scheduledAt: new Date("2026-06-23T20:00:00Z") },
  { homeTeam: "Panama",       awayTeam: "Croatia",         groupName: "L", scheduledAt: new Date("2026-06-23T23:00:00Z") },
  // MD3 (simultaneous)
  { homeTeam: "Panama",       awayTeam: "England",         groupName: "L", scheduledAt: new Date("2026-06-27T21:00:00Z") },
  { homeTeam: "Croatia",      awayTeam: "Ghana",           groupName: "L", scheduledAt: new Date("2026-06-27T21:00:00Z") },
];

async function main() {
  console.log("Seeding scoring rules...");
  for (const rule of DEFAULT_SCORING_RULES) {
    await prisma.scoringRule.upsert({
      where: { id: rule.eventType }, // use eventType as temp id reference via findFirst
      create: { ...rule, isActive: true },
      update: { points: rule.points, isActive: true },
    }).catch(async () => {
      // upsert by eventType if not by id
      const existing = await prisma.scoringRule.findFirst({ where: { eventType: rule.eventType } });
      if (!existing) {
        await prisma.scoringRule.create({ data: { ...rule, isActive: true } });
      }
    });
  }

  console.log("Seeding app settings...");
  for (const setting of DEFAULT_SETTINGS) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      create: setting,
      update: { value: setting.value },
    });
  }

  console.log("Seeding group stage matches...");
  const existingCount = await prisma.match.count();
  if (existingCount > 0) {
    console.log(`  Skipping — ${existingCount} match(es) already in DB.`);
  } else {
    await prisma.match.createMany({
      data: GROUP_MATCHES.map((m) => ({
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        stage: MatchStage.GROUP,
        groupName: m.groupName,
        scheduledAt: m.scheduledAt,
        status: MatchStatus.UPCOMING,
      })),
    });
    console.log(`  Inserted ${GROUP_MATCHES.length} matches.`);
  }

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
