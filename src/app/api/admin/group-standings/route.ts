import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const upsertGroupSchema = z.object({
  groupName: z.string().length(1),
  rank1: z.string().min(1),
  rank2: z.string().min(1),
  rank3: z.string().min(1),
  rank4: z.string().min(1),
});

export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results = await prisma.groupStandingResult.findMany({
    orderBy: { groupName: "asc" },
  });
  return NextResponse.json(results);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = upsertGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { groupName, rank1, rank2, rank3, rank4 } = parsed.data;
  const result = await prisma.groupStandingResult.upsert({
    where: { groupName },
    create: { groupName, rank1, rank2, rank3, rank4 },
    update: { rank1, rank2, rank3, rank4 },
  });

  return NextResponse.json(result);
}
