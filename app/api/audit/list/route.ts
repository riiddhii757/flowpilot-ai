import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await db.member.findFirst({
    where: { userId: session.userId },
    select: { organizationId: true },
  });
  if (!membership) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const logs = await db.auditLog.findMany({
    where: { organizationId: membership.organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, action: true, actor: true, metadata: true, createdAt: true },
  });

  return NextResponse.json({ logs });
}
