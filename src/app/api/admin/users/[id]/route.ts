import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const maxVersions = Number(body.maxVersions);
  if (!Number.isInteger(maxVersions) || maxVersions < 1 || maxVersions > 10) {
    return NextResponse.json({ error: "Invalid maxVersions" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });

  await prisma.user.update({ where: { id }, data: { maxVersions } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent admin from deleting themselves
  if (session.user.id === id) {
    return NextResponse.json({ error: "לא ניתן למחוק את עצמך" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!user) {
    return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });
  }

  // Cascade delete is handled by DB (onDelete: Cascade on all relations)
  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
