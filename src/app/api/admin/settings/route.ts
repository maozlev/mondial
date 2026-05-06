import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const patchSettingsSchema = z.object({
  leaderboard_mode: z.enum(["SEPARATE", "BEST", "SUM"]).optional(),
  predictions_locked: z.boolean().optional(),
  version_1_deadline: z.string().nullable().optional(),
  version_2_deadline: z.string().nullable().optional(),
  version_3_deadline: z.string().nullable().optional(),
});

export async function GET() {
  const settings = await prisma.appSetting.findMany();
  const result = Object.fromEntries(settings.map((s: { key: string; value: string }) => [s.key, s.value]));
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

  const updates: Array<{ key: string; value: string | null }> = [];
  if (parsed.data.leaderboard_mode !== undefined) {
    updates.push({ key: "leaderboard_mode", value: parsed.data.leaderboard_mode });
  }
  if (parsed.data.predictions_locked !== undefined) {
    updates.push({ key: "predictions_locked", value: String(parsed.data.predictions_locked) });
  }
  for (const v of [1, 2, 3] as const) {
    const key = `version_${v}_deadline` as keyof typeof parsed.data;
    if (parsed.data[key] !== undefined) {
      const val = parsed.data[key] as string | null;
      updates.push({ key: `version_${v}_deadline`, value: val });
    }
  }

  for (const { key, value } of updates) {
    if (value === null || value === "") {
      // Remove the setting
      await prisma.appSetting.deleteMany({ where: { key } });
    } else {
      await prisma.appSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
