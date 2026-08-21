import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canManageWorkflows, getCurrentUser } from "@/lib/auth";

const workflowSchema = z.object({
  name: z.string().trim().min(2).max(80),
  trigger: z.string().trim().min(2).max(80),
});

async function getWorkspace() {
  const user = await getCurrentUser();
  if (!user || user.members.length === 0) return null;
  return { user, membership: user.members[0] };
}

export async function GET() {
  const workspace = await getWorkspace();
  if (!workspace) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  const workflows = await db.workflow.findMany({ where: { organizationId: workspace.membership.organizationId }, orderBy: { id: "desc" } });
  return NextResponse.json({ ok: true, workflows });
}

export async function POST(request: Request) {
  const workspace = await getWorkspace();
  if (!workspace) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!canManageWorkflows(workspace.membership.role as Parameters<typeof canManageWorkflows>[0])) {
    return NextResponse.json({ ok: false, error: "You do not have permission to create workflows" }, { status: 403 });
  }
  try {
    const body = workflowSchema.parse(await request.json());
    const workflow = await db.workflow.create({ data: { organizationId: workspace.membership.organizationId, name: body.name, trigger: body.trigger } });
    await db.auditLog.create({ data: { organizationId: workspace.membership.organizationId, action: "Workflow created", actor: workspace.user.email, metadata: { workflowId: workflow.id, workflowName: workflow.name, trigger: workflow.trigger } } });
    return NextResponse.json({ ok: true, workflow }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Please provide a valid workflow name and trigger" }, { status: 400 });
  }
}
