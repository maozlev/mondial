import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { MatchStage, MatchStatus } from "@prisma/client";

const createMatchSchema = z.object({
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  stage: z.nativeEnum(MatchStage),
  groupName: z.string().optional(),
  scheduledAt: z.string().datetime(),
  externalId: z.string().optional(),
});

export async function GET() {
  const matches = await prisma.match.findMany({
    orderBy: [{ stage: "asc" }, { scheduledAt: "asc" }],
  });
  return NextResponse.json(matches);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createMatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const match = await prisma.match.create({
    data: {
      ...parsed.data,
      scheduledAt: new Date(parsed.data.scheduledAt),
      status: MatchStatus.UPCOMING,
    },
  });
  return NextResponse.json(match, { status: 201 });
}
