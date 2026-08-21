import { Worker } from "bullmq";
import { triageRequest } from "./lib/ai";

const worker = new Worker("flowpilot-workflows", async job => {
  if (job.name !== "execute") return;
  const text = typeof job.data.text === "string" ? job.data.text : "Business workflow request";
  const triage = await triageRequest(text);
  console.log(JSON.stringify({ jobId: job.id, workflowId: job.data.workflowId, triage }));
  return triage;
}, { connection: { url: process.env.REDIS_URL ?? "redis://localhost:6379" }, concurrency: 5 });
worker.on("completed", job => console.log(`FlowPilot job ${job.id} completed`));
worker.on("failed", (job, error) => console.error(`FlowPilot job ${job?.id} failed`, error));
