import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      predictions: {
        select: {
          version: true,
          scores: { select: { points: true } },
        },
      },
    },
  });

  const result = users.map((u) => {
    const vs: Record<number, { count: number; points: number }> = {
      1: { count: 0, points: 0 },
      2: { count: 0, points: 0 },
      3: { count: 0, points: 0 },
    };
    for (const pred of u.predictions) {
      const pts = pred.scores.reduce((s, sc) => s + sc.points, 0);
      vs[pred.version].count++;
      vs[pred.version].points += pts;
    }
    const bestPoints = Math.max(vs[1].points, vs[2].points, vs[3].points);
    return {
      id: u.id,
      name: u.name ?? u.email,
      email: u.email,
      image: u.image,
      role: u.role,
      createdAt: u.createdAt,
      v1: vs[1],
      v2: vs[2],
      v3: vs[3],
      bestPoints,
    };
  });

  result.sort((a, b) => b.bestPoints - a.bestPoints);
  return NextResponse.json(result);
}
