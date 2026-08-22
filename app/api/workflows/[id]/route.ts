import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canManageWorkflows, getCurrentUser } from "@/lib/auth";

async function workspace() {
  const user = await getCurrentUser();
  if (!user?.members.length) return null;
  return { user, membership: user.members[0] };
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await workspace();
  if (!ctx) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!canManageWorkflows(ctx.membership.role as Parameters<typeof canManageWorkflows>[0])) return NextResponse.json({ ok: false, error: "You do not have permission to delete workflows" }, { status: 403 });
  const { id } = await params;
  const workflow = await db.workflow.findFirst({ where: { id, organizationId: ctx.membership.organizationId } });
  if (!workflow) return NextResponse.json({ ok: false, error: "Workflow not found" }, { status: 404 });
  await db.workflow.delete({ where: { id: workflow.id } });
  await db.auditLog.create({ data: { organizationId: ctx.membership.organizationId, action: "Workflow deleted", actor: ctx.user.email, metadata: { workflowId: workflow.id, workflowName: workflow.name } } });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await workspace();
  if (!ctx) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  const { id } = await params;
  const workflow = await db.workflow.findFirst({ where: { id, organizationId: ctx.membership.organizationId } });
  if (!workflow) return NextResponse.json({ ok: false, error: "Workflow not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  if (body.action !== "test") return NextResponse.json({ ok: false, error: "Unsupported action" }, { status: 400 });
  const task = await db.task.create({ data: { organizationId: ctx.membership.organizationId, workflowId: workflow.id, title: `Test run: ${workflow.name}`, status: "queued", priority: "normal" } });
  await db.auditLog.create({ data: { organizationId: ctx.membership.organizationId, action: "Workflow test started", actor: ctx.user.email, metadata: { workflowId: workflow.id, taskId: task.id } } });
  return NextResponse.json({ ok: true, task });
}
