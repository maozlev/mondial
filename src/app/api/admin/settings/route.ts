import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const patchSettingsSchema = z.object({
  leaderboard_mode: z.enum(["SEPARATE", "BEST", "SUM"]).optional(),
  predictions_locked: z.boolean().optional(),
});

export async function GET() {
  const settings = await prisma.appSetting.findMany();
  const result = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updates: Array<{ key: string; value: string }> = [];
  if (parsed.data.leaderboard_mode !== undefined) {
    updates.push({ key: "leaderboard_mode", value: parsed.data.leaderboard_mode });
  }
  if (parsed.data.predictions_locked !== undefined) {
    updates.push({ key: "predictions_locked", value: String(parsed.data.predictions_locked) });
  }

  for (const { key, value } of updates) {
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  return NextResponse.json({ ok: true });
}
