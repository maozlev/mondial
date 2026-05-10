import { z } from "zod";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canPredict } from "@/lib/predictions";

const savePredictionsSchema = z.object({
  predictions: z.array(
    z.object({
      matchId: z.string(),
      homeScore: z.number().int().min(0),
      awayScore: z.number().int().min(0),
      additionalData: z.record(z.string(), z.unknown()).optional(),
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

  const predictions = await prisma.prediction.findMany({
    where: { userId: session.user.id, version: versionNum },
    include: { match: { select: { status: true, homeTeam: true, awayTeam: true, stage: true } } },
  });
  return NextResponse.json(predictions);
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
  const parsed = savePredictionsSchema.safeParse(body);
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

  const results = [];
  const errors = [];

  for (const pred of parsed.data.predictions) {
    const match = await prisma.match.findUnique({ where: { id: pred.matchId } });
    if (!match) {
      errors.push({ matchId: pred.matchId, error: "Match not found" });
      continue;
    }

    if (!canPredict(match, false, versionNum)) {
      errors.push({ matchId: pred.matchId, error: "Prediction not allowed (locked or finished)" });
      continue;
    }

    const saved = await prisma.prediction.upsert({
      where: {
        userId_matchId_version: {
          userId: session.user.id,
          matchId: pred.matchId,
          version: versionNum,
        },
      },
      create: {
        userId: session.user.id,
        matchId: pred.matchId,
        version: versionNum,
        homeScore: pred.homeScore,
        awayScore: pred.awayScore,
        ...(pred.additionalData
          ? { additionalData: pred.additionalData as Prisma.InputJsonValue }
          : {}),
      },
      update: {
        homeScore: pred.homeScore,
        awayScore: pred.awayScore,
        ...(pred.additionalData
          ? { additionalData: pred.additionalData as Prisma.InputJsonValue }
          : {}),
      },
    });
    results.push(saved);
  }

  return NextResponse.json({ saved: results, errors });
}

export async function DELETE(
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

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");

  let matchIds: string[] | undefined;
  if (stage) {
    const stageMatches = await prisma.match.findMany({
      where: { stage: stage as import("@prisma/client").MatchStage },
      select: { id: true },
    });
    matchIds = stageMatches.map((m) => m.id);
  }

  const deleted = await prisma.prediction.deleteMany({
    where: {
      userId: session.user.id,
      version: versionNum,
      ...(matchIds !== undefined ? { matchId: { in: matchIds } } : {}),
    },
  });

  return NextResponse.json({ deleted: deleted.count });
}
