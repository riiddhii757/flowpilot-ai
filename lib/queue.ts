import { Queue } from "bullmq";

export const workflowQueue = new Queue("flowpilot-workflows", {
  connection: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  },
});

export async function enqueueWorkflow(workflowId: string, payload: Record<string, unknown>) {
  return workflowQueue.add("execute", { workflowId, ...payload }, { attempts: 3, backoff: { type: "exponential", delay: 1000 }, removeOnComplete: 100, removeOnFail: 500 });
}
