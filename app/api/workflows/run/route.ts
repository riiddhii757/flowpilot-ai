import { NextResponse } from "next/server";
import { z } from "zod";
import { enqueueWorkflow } from "@/lib/queue";

const input = z.object({ workflowId: z.string().min(1), payload: z.record(z.string(), z.unknown()).default({}) });

export async function POST(request: Request) {
  try {
    const body = input.parse(await request.json());
    const job = await enqueueWorkflow(body.workflowId, body.payload);
    return NextResponse.json({ ok: true, jobId: job.id, status: "queued" }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
