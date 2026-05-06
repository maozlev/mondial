import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_STAGES = ["QF", "SF", "FINAL", "WINNER"] as const;
type KnockoutStage = typeof VALID_STAGES[number];

const saveKnockoutSchema = z.object({
  picks: z.array(
    z.object({
      stage: z.enum(VALID_STAGES),
      slot: z.number().int().min(1).max(8),
      teamName: z.string().min(1),
    })
  ),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ version: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { version } = await params;
  const versionNum = parseInt(version, 10);
  if (![1, 2, 3].includes(versionNum)) {
    return NextResponse.json({ error: "Invalid version" }, { status: 400 });
  }

  const picks = await prisma.knockoutPrediction.findMany({
    where: { userId: session.user.id, version: versionNum },
    orderBy: [{ stage: "asc" }, { slot: "asc" }],
  });
  return NextResponse.json(picks);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ version: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { version } = await params;
  const versionNum = parseInt(version, 10);
  if (![1, 2, 3].includes(versionNum)) {
    return NextResponse.json({ error: "Invalid version" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = saveKnockoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Check global lock + version deadline
  const [globalLockSetting, deadlineSetting] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: "predictions_locked" } }),
    prisma.appSetting.findUnique({ where: { key: `version_${versionNum}_deadline` } }),
  ]);
  const globalLock = globalLockSetting?.value === "true";
  if (globalLock) {
    return NextResponse.json({ error: "הניחושים נעולים כרגע" }, { status: 403 });
  }
  if (deadlineSetting?.value) {
    const dl = new Date(deadlineSetting.value);
    if (!isNaN(dl.getTime()) && new Date() > dl) {
      return NextResponse.json({ error: "הדד-ליין לגרסה זו עבר" }, { status: 403 });
    }
  }

  const userId = session.user.id;
  for (const pick of parsed.data.picks) {
    await prisma.knockoutPrediction.upsert({
      where: {
        userId_version_stage_slot: {
          userId,
          version: versionNum,
          stage: pick.stage,
          slot: pick.slot,
        },
      },
      create: { userId, version: versionNum, stage: pick.stage, slot: pick.slot, teamName: pick.teamName },
      update: { teamName: pick.teamName },
    });
  }

  return NextResponse.json({ ok: true });
}
