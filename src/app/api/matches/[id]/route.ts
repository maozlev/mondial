import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { MatchStatus } from "@prisma/client";
import { recalculateMatchScores } from "@/lib/recalculate";

const patchMatchSchema = z.object({
  homeScore: z.number().int().min(0).optional(),
  awayScore: z.number().int().min(0).optional(),
  status: z.nativeEnum(MatchStatus).optional(),
  homeTeam: z.string().min(1).optional(),
  awayTeam: z.string().min(1).optional(),
  scheduledAt: z.string().datetime().optional(),
  groupName: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = patchMatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.scheduledAt) {
    data.scheduledAt = new Date(parsed.data.scheduledAt);
  }

  // If result is being set, mark as FINISHED
  if (
    parsed.data.homeScore !== undefined &&
    parsed.data.awayScore !== undefined
  ) {
    data.status = MatchStatus.FINISHED;
  }

  const match = await prisma.match.update({ where: { id }, data });

  // Auto-recalculate scores when result is entered
  if (
    match.status === MatchStatus.FINISHED &&
    match.homeScore !== null &&
    match.awayScore !== null
  ) {
    await recalculateMatchScores(match.id);
  }

  return NextResponse.json(match);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.match.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
