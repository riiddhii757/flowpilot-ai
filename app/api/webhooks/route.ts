import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { triageRequest } from "@/lib/ai";

const payloadSchema = z.object({
  organizationId: z.string().min(1),
  workflowId: z.string().min(1).optional(),
  text: z.string().min(1).max(10000),
  source: z.string().min(1).max(100),
});

function validSignature(payload: string, signature: string | null) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const supplied = signature.replace(/^sha256=/, "");
  if (expected.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-flowpilot-signature"))) {
    return NextResponse.json({ ok: false, error: "Invalid webhook signature" }, { status: 401 });
  }

  try {
    const body = payloadSchema.parse(JSON.parse(raw));
    const result = await triageRequest(body.text);
    const audit = await db.auditLog.create({
      data: {
        organizationId: body.organizationId,
        action: "ai.triage.completed",
        actor: "system",
        metadata: {
          workflowId: body.workflowId ?? null,
          source: body.source,
          category: result.category,
          priority: result.priority,
          summary: result.summary,
          suggestedAction: result.suggestedAction,
          requiresApproval: result.requiresApproval,
        },
      },
    });

    return NextResponse.json({ ok: true, decision: result, auditId: audit.id }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid webhook payload" }, { status: 400 });
  }
}
