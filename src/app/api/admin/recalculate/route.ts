import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { recalculateAllScores } from "@/lib/recalculate";

export async function POST() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await recalculateAllScores();
  return NextResponse.json({ ok: true });
}
