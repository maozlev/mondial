import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const saveStandingsSchema = z.object({
  standings: z.array(
    z.object({
      groupName: z.string().length(1),
      rank1: z.string().min(1),
      rank2: z.string().min(1),
      rank3: z.string().min(1),
      rank4: z.string().min(1),
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

  const standings = await prisma.groupStandingPrediction.findMany({
    where: { userId: session.user.id, version: versionNum },
  });
  return NextResponse.json(standings);
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
  const parsed = saveStandingsSchema.safeParse(body);
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
  for (const s of parsed.data.standings) {
    await prisma.groupStandingPrediction.upsert({
      where: { userId_version_groupName: { userId, version: versionNum, groupName: s.groupName } },
      create: { userId, version: versionNum, groupName: s.groupName, rank1: s.rank1, rank2: s.rank2, rank3: s.rank3, rank4: s.rank4 },
      update: { rank1: s.rank1, rank2: s.rank2, rank3: s.rank3, rank4: s.rank4 },
    });
  }

  return NextResponse.json({ ok: true });
}
