import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const body = await req.json();
  const { code } = body;

  if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "קוד לא תקין" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { inviteCode: true, approvedAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });
  }

  if (user.approvedAt) {
    return NextResponse.json({ ok: true }); // Already approved
  }

  if (!user.inviteCode || user.inviteCode !== code) {
    return NextResponse.json({ error: "קוד שגוי" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { approvedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
