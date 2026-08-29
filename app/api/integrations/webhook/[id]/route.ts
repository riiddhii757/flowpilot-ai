import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/oauth";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const integration = await db.integration.findUnique({ where: { id } });
  if (!integration || integration.provider !== "webhook" || !integration.enabled || !integration.accessToken) {
    return NextResponse.json({ error: "Webhook not found or inactive" }, { status: 404 });
  }

  const rawBody = await request.text();
  const provided = request.headers.get("x-flowpilot-signature") || "";
  if (!provided) return NextResponse.json({ error: "Missing X-FlowPilot-Signature" }, { status: 401 });

  let secret: string;
  try { secret = decrypt(integration.accessToken); } catch { return NextResponse.json({ error: "Webhook credential unavailable" }, { status: 500 }); }
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(provided.replace(/^sha256=/, ""), "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: unknown = rawBody;
  try { payload = JSON.parse(rawBody); } catch {}
  await db.auditLog.create({
    data: {
      organizationId: integration.organizationId,
      action: "webhook.received",
      actor: "external-webhook",
      metadata: { integrationId: integration.id, payload },
    },
  });

  return NextResponse.json({ ok: true, received: true });
}
