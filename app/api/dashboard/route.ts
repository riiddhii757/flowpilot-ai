import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.members.length === 0) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  const membership = user.members[0];
  const organizationId = membership.organizationId;

  const [workflows, tasks, pendingApprovals, recentActivity] = await Promise.all([
    db.workflow.findMany({
      where: { organizationId },
      orderBy: { id: "desc" },
      take: 6,
    }),
    db.task.findMany({
      where: { organizationId },
      include: { workflow: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.task.count({
      where: { organizationId, status: "needs_approval" },
    }),
    db.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const completedTasks = await db.task.count({
    where: { organizationId, status: "completed" },
  });

  const totalTasks = await db.task.count({ where: { organizationId } });
  const averageSuccessRate = workflows.length
    ? workflows.reduce((sum, workflow) => sum + workflow.successRate, 0) / workflows.length
    : 0;

  return NextResponse.json({
    ok: true,
    organization: {
      id: membership.organization.id,
      name: membership.organization.name,
      role: membership.role,
    },
    user: { name: user.name, email: user.email },
    metrics: {
      workflows: workflows.length,
      tasksProcessed: completedTasks,
      successRate: Number(averageSuccessRate.toFixed(1)),
      pendingApprovals,
      totalTasks,
    },
    workflows,
    tasks,
    recentActivity,
  });
}
