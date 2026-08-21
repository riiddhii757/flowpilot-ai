import { NextResponse } from "next/server";
import { z } from "zod";

const decisionSchema = z.object({ taskId: z.string().min(1), decision: z.enum(["approve", "reject"]), note: z.string().max(1000).optional() });

export async function POST(request: Request) {
  const body = decisionSchema.parse(await request.json());
  return NextResponse.json({ ok: true, taskId: body.taskId, status: body.decision === "approve" ? "approved" : "rejected", decidedAt: new Date().toISOString() });
}
