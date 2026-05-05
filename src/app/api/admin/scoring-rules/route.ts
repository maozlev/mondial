import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const createRuleSchema = z.object({
  eventType: z.string().min(1),
  name: z.string().min(1),
  nameHe: z.string().min(1),
  points: z.number().int().min(0),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
});

export async function GET() {
  const rules = await prisma.scoringRule.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rule = await prisma.scoringRule.create({ data: parsed.data });
  return NextResponse.json(rule, { status: 201 });
}
