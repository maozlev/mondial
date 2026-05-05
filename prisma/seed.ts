import { PrismaClient, MatchStage, MatchStatus } from "@prisma/client";

const prisma = new PrismaClient();

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

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
