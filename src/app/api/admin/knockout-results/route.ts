import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const VALID_STAGES = ["QF", "SF", "FINAL", "WINNER"] as const;

const upsertKnockoutSchema = z.object({
  stage: z.enum(VALID_STAGES),
  slot: z.number().int().min(1).max(8),
  teamName: z.string().min(1),
});

export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results = await prisma.knockoutResult.findMany({
    orderBy: [{ stage: "asc" }, { slot: "asc" }],
  });
  return NextResponse.json(results);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = upsertKnockoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { stage, slot, teamName } = parsed.data;
  const result = await prisma.knockoutResult.upsert({
    where: { stage_slot: { stage, slot } },
    create: { stage, slot, teamName },
    update: { teamName },
  });

  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = z.object({
    stage: z.enum(VALID_STAGES),
    slot: z.number().int().min(1).max(8),
  }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.knockoutResult.deleteMany({
    where: { stage: parsed.data.stage, slot: parsed.data.slot },
  });

  return NextResponse.json({ ok: true });
}
