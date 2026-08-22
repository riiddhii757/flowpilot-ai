import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  organizationId: z.string(),
  title: z.string().min(2),
  workflowId: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const user = await getCurrentUser();
    const membership = user?.members.find((member) => member.organizationId === body.organizationId);
    if (!membership) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });

    // Test-run clicks should be idempotent for a short window so one request
    // cannot flood the inbox with identical queued tasks.
    if (body.title.startsWith("Test run:")) {
      const recent = await db.task.findFirst({
        where: {
          organizationId: body.organizationId,
          title: body.title,
          status: "queued",
          createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
      });
      if (recent) return NextResponse.json({ ok: true, task: recent, deduplicated: true }, { status: 200 });
    }

    const task = await db.task.create({ data: body });
    return NextResponse.json({ ok: true, task }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Unable to create task" }, { status: 400 });
  }
}

export async function GET() {
  const user = await getCurrentUser();
  const membership = user?.members[0];
  if (!membership) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  const tasks = await db.task.findMany({ where: { organizationId: membership.organizationId }, include: { workflow: true }, orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json({ ok: true, tasks });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  const membership = user?.members[0];
  if (!membership) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  const { id } = await request.json().catch(() => ({ id: "" }));
  if (!id) return NextResponse.json({ ok: false, error: "Task id is required" }, { status: 400 });
  const task = await db.task.findFirst({ where: { id, organizationId: membership.organizationId } });
  if (!task) return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 });
  await db.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
