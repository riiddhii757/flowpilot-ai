import { Worker } from "bullmq";
import { db } from "./lib/db";

const worker = new Worker(
  "flowpilot-workflows",
  async job => {
    if (job.name !== "execute") return;

    const { taskId, organizationId, workflowId } = job.data as {
      taskId: string;
      organizationId: string;
      workflowId?: string;
    };

    await db.task.update({
      where: { id: taskId },
      data: { status: "processing" },
    });

    await db.auditLog.create({
      data: {
        organizationId,
        action: "workflow.execution.started",
        actor: "system",
        metadata: { taskId, workflowId: workflowId ?? null, jobId: job.id ?? null },
      },
    });

    // External action execution will be plugged in here in the next phase.
    await db.task.update({
      where: { id: taskId },
      data: { status: "completed" },
    });

    await db.auditLog.create({
      data: {
        organizationId,
        action: "workflow.execution.completed",
        actor: "system",
        metadata: { taskId, workflowId: workflowId ?? null, jobId: job.id ?? null },
      },
    });

    return { taskId, status: "completed" };
  },
  {
    connection: {
      url: process.env.REDIS_URL ?? "redis://localhost:6379",
    },
    concurrency: 5,
  },
);

worker.on("completed", job => console.log(`FlowPilot job ${job.id} completed`));

worker.on("failed", async (job, error) => {
  console.error(`FlowPilot job ${job?.id} failed`, error);
  if (!job) return;

  const { taskId, organizationId, workflowId } = job.data as {
    taskId: string;
    organizationId: string;
    workflowId?: string;
  };

  await db.task.update({
    where: { id: taskId },
    data: { status: "failed" },
  });

  await db.auditLog.create({
    data: {
      organizationId,
      action: "workflow.execution.failed",
      actor: "system",
      metadata: {
        taskId,
        workflowId: workflowId ?? null,
        jobId: job.id ?? null,
        error: error.message,
      },
    },
  });
});

console.log("FlowPilot worker started");
